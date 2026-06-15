import Board from '../models/Board.js';
import List from '../models/List.js';
import Card from '../models/Card.js';
import boardRepository from '../repositories/boardRepository.js';
import listRepository from '../repositories/listRepository.js';
import userRepository from '../repositories/userRepository.js';
import { getIO } from '../socket.js';
import logger from '../config/logger.js';

// ─── Board Authorization Helper ───────────────────────────────────────────────

/**
 * Checks whether userId is the owner or a member of boardMeta.
 * Accepts a lean or Mongoose object.
 */
export const isBoardAccessible = (boardMeta, userId) => {
  const uid = userId.toString();
  const isOwner = boardMeta.owner.toString() === uid;
  const isMember = (boardMeta.members || []).some(
    (m) => (m.user || m).toString() === uid
  );
  return isOwner || isMember;
};

export const isBoardEditable = (boardMeta, userId) => {
  const uid = userId.toString();
  const isOwner = boardMeta.owner.toString() === uid;
  const isAdmin = (boardMeta.members || []).some(
    (m) => (m.user || m).toString() === uid && m.role === 'admin'
  );
  return isOwner || isAdmin;
};

// ─── Socket Helper ────────────────────────────────────────────────────────────

const emitToBoard = (boardId, event, payload) => {
  try {
    const io = getIO();
    if (io && boardId) io.to(`board:${boardId.toString()}`).emit(event, payload);
  } catch (e) {
    logger.error(`[socket] emit "${event}" to board:${boardId} failed`, { error: e.message });
  }
};

// ─── Service Methods ──────────────────────────────────────────────────────────

/**
 * Returns all non-archived boards the user owns or is a member of.
 */
export const listBoards = async (userId) => {
  return Board.find({
    $or: [{ owner: userId }, { 'members.user': userId }],
    isArchived: false
  })
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar')
    .sort({ updatedAt: -1 });
};

/**
 * Returns the full board with nested lists and non-archived cards.
 */
export const getBoardById = async (boardId, userId) => {
  // Auth check on a lightweight lean document first
  const boardMeta = await Board.findById(boardId)
    .select('owner members isArchived')
    .lean();

  if (!boardMeta) {
    const err = new Error('Board not found');
    err.statusCode = 404;
    throw err;
  }

  if (!isBoardAccessible(boardMeta, userId)) {
    const err = new Error('Not authorized to view this board');
    err.statusCode = 403;
    throw err;
  }

  return Board.findById(boardId)
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar')
    .populate({
      path: 'lists',
      options: { sort: { position: 1 } },
      populate: {
        path: 'cards',
        select: 'title description priority status labels dueDate assignedTo position isArchived checklist',
        match: { isArchived: { $ne: true } },
        options: { sort: { position: 1 } },
        populate: { path: 'assignedTo', select: 'name email avatar' }
      }
    });
};

/**
 * Creates a new standalone board (not linked to a project).
 */
export const createBoard = async (userId, { name, description, background }) => {
  const board = await Board.create({
    name,
    description,
    background,
    owner: userId,
    members: []
  });
  await board.populate('owner', 'name email avatar');
  return board;
};

/**
 * Updates board metadata. Owner or admin only.
 */
export const updateBoard = async (boardId, userId, { name, description, background }) => {
  const board = await boardRepository.findById(boardId);
  if (!board) {
    const err = new Error('Board not found');
    err.statusCode = 404;
    throw err;
  }

  if (!isBoardEditable(board, userId)) {
    const err = new Error('Not authorized to update this board');
    err.statusCode = 403;
    throw err;
  }

  if (name) board.name = name;
  if (description) board.description = description;
  if (background) board.background = background;

  const updatedBoard = await board.save();
  await updatedBoard.populate('owner', 'name email avatar');
  await updatedBoard.populate('members.user', 'name email avatar');
  return updatedBoard;
};

/**
 * Deletes a board and cascades deletion to lists and cards. Owner only.
 */
export const deleteBoard = async (boardId, userId) => {
  const board = await boardRepository.findById(boardId);
  if (!board) {
    const err = new Error('Board not found');
    err.statusCode = 404;
    throw err;
  }

  if (board.owner.toString() !== userId.toString()) {
    const err = new Error('Only owner can delete this board');
    err.statusCode = 403;
    throw err;
  }

  const listIds = await List.find({ board: board._id }).distinct('_id');
  await Card.deleteMany({ list: { $in: listIds } });
  await List.deleteMany({ board: board._id });
  await board.deleteOne();
};

/**
 * Adds a user (found by email) to the board. Owner or admin only.
 */
export const addBoardMember = async (boardId, actorId, { email, role }) => {
  const board = await boardRepository.findById(boardId);
  if (!board) {
    const err = new Error('Board not found');
    err.statusCode = 404;
    throw err;
  }

  if (!isBoardEditable(board, actorId)) {
    const err = new Error('Not authorized to add members');
    err.statusCode = 403;
    throw err;
  }

  const user = await userRepository.findByEmail(email);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const alreadyMember = (board.members || []).some(
    (m) => (m.user || m).toString() === user._id.toString()
  );

  if (alreadyMember) {
    const err = new Error('User is already a member');
    err.statusCode = 400;
    throw err;
  }

  board.members.push({ user: user._id, role: role || 'member' });
  await board.save();
  await board.populate('members.user', 'name email avatar');
  return board;
};

/**
 * Removes a member from the board. Cannot remove the owner.
 */
export const removeBoardMember = async (boardId, actorId, memberId) => {
  const board = await boardRepository.findById(boardId);
  if (!board) {
    const err = new Error('Board not found');
    err.statusCode = 404;
    throw err;
  }

  if (!isBoardEditable(board, actorId)) {
    const err = new Error('Not authorized to remove members');
    err.statusCode = 403;
    throw err;
  }

  if (board.owner.toString() === memberId) {
    const err = new Error('Cannot remove board owner');
    err.statusCode = 400;
    throw err;
  }

  board.members = (board.members || []).filter(
    (m) => (m.user || m).toString() !== memberId
  );
  await board.save();
  await board.populate('members.user', 'name email avatar');
  return board;
};

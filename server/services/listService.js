import List from '../models/List.js';
import Card from '../models/Card.js';
import Board from '../models/Board.js';
import listRepository from '../repositories/listRepository.js';
import boardRepository from '../repositories/boardRepository.js';
import { isBoardAccessible } from './boardService.js';
import { getIO } from '../socket.js';

// ─── Socket Helper ────────────────────────────────────────────────────────────

const emitToBoard = (boardId, event, payload) => {
  try {
    const io = getIO();
    if (io && boardId) io.to(boardId.toString()).emit(event, payload);
  } catch (e) {
    console.error(`[socket] emit "${event}" to board:${boardId} failed:`, e.message);
  }
};

// ─── Service Methods ──────────────────────────────────────────────────────────

/**
 * Creates a new list inside a board. Requires board membership.
 */
export const createList = async (userId, { name, boardId, position }) => {
  const board = await boardRepository.findById(boardId);
  if (!board) {
    const err = new Error('Board not found');
    err.statusCode = 404;
    throw err;
  }

  if (!isBoardAccessible(board, userId)) {
    const err = new Error('Not authorized to create lists');
    err.statusCode = 403;
    throw err;
  }

  const lastList = await List.findOne({ board: boardId }).sort({ position: -1 });
  const newPosition = position !== undefined ? position : (lastList ? lastList.position + 1 : 0);

  const list = await List.create({
    name,
    board: boardId,
    position: newPosition,
    cards: []
  });

  board.lists.push(list._id);
  await board.save();

  return list;
};

/**
 * Updates a list's name or position. Requires board membership.
 */
export const updateList = async (listId, userId, { name, position }) => {
  const list = await listRepository.findById(listId);
  if (!list) {
    const err = new Error('List not found');
    err.statusCode = 404;
    throw err;
  }

  const board = await boardRepository.findById(list.board);
  if (!board) {
    const err = new Error('Board not found');
    err.statusCode = 404;
    throw err;
  }

  if (!isBoardAccessible(board, userId)) {
    const err = new Error('Not authorized to update this list');
    err.statusCode = 403;
    throw err;
  }

  if (name) list.name = name;
  if (position !== undefined) list.position = position;

  return list.save();
};

/**
 * Deletes a list and all its cards. Requires board membership.
 */
export const deleteList = async (listId, userId) => {
  const list = await listRepository.findById(listId);
  if (!list) {
    const err = new Error('List not found');
    err.statusCode = 404;
    throw err;
  }

  const board = await boardRepository.findById(list.board);
  if (!board) {
    const err = new Error('Board not found');
    err.statusCode = 404;
    throw err;
  }

  if (!isBoardAccessible(board, userId)) {
    const err = new Error('Not authorized to delete this list');
    err.statusCode = 403;
    throw err;
  }

  // Remove from board's list array
  board.lists = (board.lists || []).filter(
    (id) => id.toString() !== list._id.toString()
  );
  await board.save();

  // Cascade delete all cards
  await Card.deleteMany({ list: list._id });
  await list.deleteOne();
};

/**
 * Reorders lists in a board by updating their position field in bulk.
 * Requires board membership.
 */
export const reorderLists = async (boardId, userId, listIds) => {
  const board = await boardRepository.findById(boardId);
  if (!board) {
    const err = new Error('Board not found');
    err.statusCode = 404;
    throw err;
  }

  if (!isBoardAccessible(board, userId)) {
    const err = new Error('Not authorized to reorder lists');
    err.statusCode = 403;
    throw err;
  }

  await Promise.all(
    listIds.map((id, index) =>
      List.findByIdAndUpdate(id, { position: index })
    )
  );

  return List.find({ board: boardId }).sort({ position: 1 });
};

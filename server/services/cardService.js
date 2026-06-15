import Card from '../models/Card.js';
import List from '../models/List.js';
import Board from '../models/Board.js';
import User from '../models/User.js';
import cardRepository from '../repositories/cardRepository.js';
import listRepository from '../repositories/listRepository.js';
import boardRepository from '../repositories/boardRepository.js';
import { isBoardAccessible } from './boardService.js';
import { notify, notifyMany } from './notificationService.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { getIO } from '../socket.js';
import logger from '../config/logger.js';

// ─── Date helpers ─────────────────────────────────────────────────────────────

const toDateStart = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  dt.setHours(0, 0, 0, 0);
  return dt;
};

const toDateEnd = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  dt.setHours(23, 59, 59, 999);
  return dt;
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
 * Returns paginated cards visible to the authenticated user, with
 * optional filters for board, status, priority, assignee, and due date.
 */
export const getCards = async (
  userId,
  { boardId, search, status, priority, assignedTo, dueDate, page = 1, limit = 10, sort } = {}
) => {
  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const skip = (parsedPage - 1) * parsedLimit;

  // Find boards the user has access to (optionally scoped to one board)
  const accessibleBoards = await Board.find({
    $or: [{ owner: userId }, { 'members.user': userId }],
    ...(boardId ? { _id: boardId } : {}),
    isArchived: { $ne: true }
  }).select('_id');

  const boardIds = accessibleBoards.map((b) => b._id);
  if (!boardIds.length) {
    return { data: [], page: parsedPage, totalPages: 1, totalItems: 0 };
  }

  const lists = await List.find({ board: { $in: boardIds } }).select('_id');
  const listIds = lists.map((l) => l._id);
  if (!listIds.length) {
    return { data: [], page: parsedPage, totalPages: 1, totalItems: 0 };
  }

  const query = { list: { $in: listIds } };

  if (search && typeof search === 'string' && search.trim()) {
    const term = escapeRegex(search.trim());
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { title: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } }
      ]
    });
  }

  if (status) {
    const statusMap = {
      todo: 'todo', 'in progress': 'in-progress', inprogress: 'in-progress',
      review: 'review', completed: 'done', done: 'done'
    };
    query.status = statusMap[String(status).toLowerCase()] || status;
  }

  if (priority) {
    const priorityMap = { low: 'low', medium: 'medium', high: 'high', urgent: 'urgent' };
    query.priority = priorityMap[String(priority).toLowerCase()] || priority;
  }

  if (assignedTo) query.assignedTo = assignedTo;

  if (dueDate) {
    const start = toDateStart(dueDate);
    const end = toDateEnd(dueDate);
    if (start && end) query.dueDate = { $gte: start, $lte: end };
  }

  const normalizeSort = (rawSort) => {
    const s = String(rawSort || 'newest').trim().toLowerCase();
    if (s === 'duedate' || s === 'due_date') return 'dueDate';
    if (['newest', 'oldest', 'priority', 'alphabetical'].includes(s)) return s;
    return 'newest';
  };

  const sortOption = (() => {
    switch (normalizeSort(sort)) {
      case 'oldest':       return { createdAt: 1 };
      case 'alphabetical': return { title: 1 };
      case 'priority':     return { priority: 1, createdAt: -1 };
      case 'dueDate':      return { dueDate: 1, createdAt: -1 };
      default:             return { createdAt: -1 };
    }
  })();

  const totalItems = await Card.countDocuments(query);
  const totalPages = Math.max(Math.ceil(totalItems / parsedLimit) || 1, 1);

  const cards = await Card.find(query)
    .populate({ path: 'list', populate: { path: 'board', select: 'owner members name' } })
    .populate('assignedTo', 'name email avatar')
    .populate('comments.user', 'name email avatar')
    .sort(sortOption)
    .skip(skip)
    .limit(parsedLimit);

  return { data: cards, page: parsedPage, totalPages, totalItems };
};

/**
 * Creates a new card in a list after verifying board membership.
 */
export const createCard = async (userId, { title, description, listId, priority, labels, dueDate, position }) => {
  const list = await List.findById(listId).populate('board');
  if (!list) {
    const err = new Error('List not found');
    err.statusCode = 404;
    throw err;
  }

  if (!isBoardAccessible(list.board, userId)) {
    const err = new Error('Not authorized to create cards');
    err.statusCode = 403;
    throw err;
  }

  const lastCard = await Card.findOne({ list: listId }).sort({ position: -1 });
  const newPosition = position !== undefined ? position : (lastCard ? lastCard.position + 1 : 0);

  const card = await Card.create({
    title, description, list: listId, priority, labels, dueDate,
    position: newPosition
  });

  list.cards.push(card._id);
  await list.save();

  await card.populate('assignedTo', 'name email avatar');
  emitToBoard(list.board._id, 'cardCreated', card);

  return card;
};

/**
 * Returns a single card if the requester is a board member.
 */
export const getCardById = async (cardId, userId) => {
  const card = await Card.findById(cardId)
    .populate({ path: 'list', populate: { path: 'board', populate: [
      { path: 'owner', select: 'name email avatar' },
      { path: 'members.user', select: 'name email avatar' }
    ]}})
    .populate('assignedTo', 'name email avatar')
    .populate('comments.user', 'name email avatar');

  if (!card) {
    const err = new Error('Card not found');
    err.statusCode = 404;
    throw err;
  }

  const board = card.list.board;
  if (!isBoardAccessible(board, userId)) {
    const err = new Error('Not authorized to view this card');
    err.statusCode = 403;
    throw err;
  }

  return card;
};

/**
 * Updates card fields. Notifies board members and emits a socket event.
 */
export const updateCard = async (cardId, userId, actorName, fields) => {
  const card = await Card.findById(cardId)
    .populate({ path: 'list', populate: { path: 'board' } });

  if (!card) {
    const err = new Error('Card not found');
    err.statusCode = 404;
    throw err;
  }

  if (!isBoardAccessible(card.list.board, userId)) {
    const err = new Error('Not authorized to update this card');
    err.statusCode = 403;
    throw err;
  }

  const { title, description, priority, labels, dueDate, position, checklist } = fields;
  if (title) card.title = title;
  if (description) card.description = description;
  if (priority) card.priority = priority;
  if (labels) card.labels = labels;
  if (dueDate !== undefined) card.dueDate = dueDate;
  if (position !== undefined) card.position = position;
  if (checklist) card.checklist = checklist;

  const updatedCard = await card.save();
  await updatedCard.populate('assignedTo', 'name email avatar');
  await updatedCard.populate('comments.user', 'name email avatar');

  // Notify board members (non-blocking)
  const board = card.list.board;
  const recipientIds = new Set([
    ...(updatedCard.assignedTo || []).map((u) => u._id?.toString() || u.toString()),
    board.owner.toString(),
    ...(board.members || []).map((m) => (m.user || m).toString())
  ]);
  recipientIds.delete(userId.toString());

  notifyMany({
    userIds: [...recipientIds],
    actorId: userId,
    type: 'task_updated',
    message: `${actorName} updated a task`,
    referenceId: updatedCard._id
  });

  emitToBoard(board._id, 'cardUpdated', updatedCard);
  return updatedCard;
};

/**
 * Deletes a card and emits a realtime event. Board membership required.
 */
export const deleteCard = async (cardId, userId) => {
  const card = await Card.findById(cardId)
    .populate({ path: 'list', populate: { path: 'board' } });

  if (!card) {
    const err = new Error('Card not found');
    err.statusCode = 404;
    throw err;
  }

  if (!isBoardAccessible(card.list.board, userId)) {
    const err = new Error('Not authorized to delete this card');
    err.statusCode = 403;
    throw err;
  }

  const list = await List.findById(card.list._id);
  list.cards = list.cards.filter((id) => id.toString() !== card._id.toString());
  await list.save();

  await card.deleteOne();

  emitToBoard(
    card.list.board._id,
    'cardDeleted',
    { cardId: card._id, listId: card.list._id }
  );
};

/**
 * Moves a card to a target list (within the same board), infers status from list name.
 */
export const moveCard = async (cardId, userId, { listId, position }) => {
  const card = await Card.findById(cardId)
    .populate({ path: 'list', populate: { path: 'board' } });

  if (!card) {
    const err = new Error('Card not found');
    err.statusCode = 404;
    throw err;
  }

  const board = card.list.board;
  if (!isBoardAccessible(board, userId)) {
    const err = new Error('Not authorized to move this card');
    err.statusCode = 403;
    throw err;
  }

  const boardId = board._id.toString();

  const newList = await List.findById(listId);
  if (!newList) {
    const err = new Error('Target list not found');
    err.statusCode = 404;
    throw err;
  }

  if (newList.board.toString() !== boardId) {
    const err = new Error('Target list must belong to the same board');
    err.statusCode = 400;
    throw err;
  }

  const oldList = await List.findById(card.list._id);
  oldList.cards = oldList.cards.filter((id) => id.toString() !== card._id.toString());
  await oldList.save();

  card.list = listId;
  card.position = position ?? newList.cards.length;

  // Infer status from the column name
  const listName = (newList.name || '').toLowerCase();
  if (listName.includes('done') || listName.includes('complete')) card.status = 'done';
  else if (listName.includes('review')) card.status = 'review';
  else if (listName.includes('progress')) card.status = 'in-progress';
  else card.status = 'todo';

  await card.save();
  newList.cards.push(card._id);
  await newList.save();

  await card.populate('assignedTo', 'name email avatar');

  emitToBoard(boardId, 'cardMoved', {
    card, fromList: oldList._id, toList: newList._id, position: card.position
  });

  return card;
};

/**
 * Adds a comment to a card.
 */
export const addComment = async (cardId, userId, text) => {
  const card = await Card.findById(cardId)
    .populate({ path: 'list', populate: { path: 'board' } });

  if (!card) {
    const err = new Error('Card not found');
    err.statusCode = 404;
    throw err;
  }

  if (!isBoardAccessible(card.list.board, userId)) {
    const err = new Error('Not authorized to comment on this card');
    err.statusCode = 403;
    throw err;
  }

  card.comments.push({ user: userId, text, createdAt: new Date() });
  await card.save();
  await card.populate('comments.user', 'name email avatar');

  emitToBoard(card.list.board._id, 'cardUpdated', card);
  return card.comments;
};

/**
 * Assigns a user to a card. User must be a board member.
 */
export const assignUser = async (cardId, actorId, actorName, userId) => {
  const card = await Card.findById(cardId)
    .populate({ path: 'list', populate: { path: 'board' } });

  if (!card) {
    const err = new Error('Card not found');
    err.statusCode = 404;
    throw err;
  }

  const board = card.list.board;
  if (!isBoardAccessible(board, actorId)) {
    const err = new Error('Not authorized to assign users');
    err.statusCode = 403;
    throw err;
  }

  const assignee = await User.findById(userId);
  if (!assignee) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const isAssigneeMember =
    board.owner.toString() === userId.toString() ||
    (board.members || []).some((m) => (m.user || m).toString() === userId.toString());

  if (!isAssigneeMember) {
    const err = new Error('User must be a board member to be assigned');
    err.statusCode = 400;
    throw err;
  }

  const alreadyAssigned = card.assignedTo.some((u) => u.toString() === userId.toString());
  if (alreadyAssigned) {
    const err = new Error('User already assigned');
    err.statusCode = 400;
    throw err;
  }

  card.assignedTo.push(userId);
  await card.save();
  await card.populate('assignedTo', 'name email avatar');

  // Notify and emit (non-blocking)
  notify({
    userId,
    actorId,
    type: 'task_assigned',
    message: `${actorName} assigned you to a task`,
    referenceId: card._id
  });
  emitToBoard(board._id, 'cardUpdated', card);

  return card;
};

/**
 * Unassigns a user from a card.
 */
export const unassignUser = async (cardId, actorId, userId) => {
  const card = await Card.findById(cardId)
    .populate({ path: 'list', populate: { path: 'board' } });

  if (!card) {
    const err = new Error('Card not found');
    err.statusCode = 404;
    throw err;
  }

  if (!isBoardAccessible(card.list.board, actorId)) {
    const err = new Error('Not authorized to unassign users');
    err.statusCode = 403;
    throw err;
  }

  card.assignedTo = card.assignedTo.filter((u) => u.toString() !== userId.toString());
  await card.save();
  await card.populate('assignedTo', 'name email avatar');

  emitToBoard(card.list.board._id, 'cardUpdated', card);
  return card;
};

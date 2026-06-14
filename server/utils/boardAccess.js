import Board from '../models/Board.js';
import List from '../models/List.js';
import Card from '../models/Card.js';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import { getEffectiveRoleForUser } from './projectPermissions.js';

export const isBoardMember = (board, userId) => {
  if (!board || !userId) return false;
  const uid = userId.toString();
  if (board.owner && board.owner.toString() === uid) return true;
  return (board.members || []).some((m) => {
    const memberId = m.user?._id ? m.user._id.toString() : m.user?.toString();
    return memberId === uid;
  });
};

export const getBoardForUser = async (boardId, userId) => {
  const board = await Board.findById(boardId);
  if (!board || !isBoardMember(board, userId)) return null;
  return board;
};

export const getCardWithBoardAccess = async (cardId, userId) => {
  const card = await Card.findById(cardId).populate({
    path: 'list',
    populate: { path: 'board' }
  });
  if (!card?.list?.board) return null;
  if (!isBoardMember(card.list.board, userId)) return null;
  return card;
};

export const canAccessTaskOrCard = async (taskId, userId) => {
  const card = await Card.findById(taskId).populate({
    path: 'list',
    populate: { path: 'board' }
  });
  if (card?.list?.board) {
    return isBoardMember(card.list.board, userId) ? { type: 'card', target: card } : null;
  }

  const task = await Task.findById(taskId);
  if (!task) return null;

  const project = await Project.findById(task.projectId);
  if (!project) return null;

  const role = getEffectiveRoleForUser(project, userId);
  return role ? { type: 'task', target: task } : null;
};

export const getUserBoardIds = async (userId) => {
  const boards = await Board.find({
    $or: [{ owner: userId }, { 'members.user': userId }],
    isArchived: { $ne: true }
  }).select('_id project');
  return boards;
};

export const getListIdsForBoards = async (boardIds) => {
  if (!boardIds.length) return [];
  const lists = await List.find({ board: { $in: boardIds } }).select('_id');
  return lists.map((l) => l._id);
};

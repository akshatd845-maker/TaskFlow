import {
  createList,
  updateList,
  deleteList,
  reorderLists
} from '../services/listService.js';
import logger from '../config/logger.js';

// ─── Error Handler ────────────────────────────────────────────────────────────

const handleServiceError = (res, error) => {
  const status = error.statusCode || 500;
  logger.error(error.message, { error: error.stack });
  return res.status(status).json({ message: error.message });
};

// ─── Controllers ──────────────────────────────────────────────────────────────

// @desc    Create new list
// @route   POST /api/lists
// @access  Private
export const createListController = async (req, res) => {
  try {
    const { name, boardId, position } = req.body;
    const list = await createList(req.user._id, { name, boardId, position });
    res.status(201).json(list);
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Update list
// @route   PUT /api/lists/:id
// @access  Private
export const updateListController = async (req, res) => {
  try {
    const { name, position } = req.body;
    const list = await updateList(req.params.id, req.user._id, { name, position });
    res.json(list);
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Delete list
// @route   DELETE /api/lists/:id
// @access  Private
export const deleteListController = async (req, res) => {
  try {
    await deleteList(req.params.id, req.user._id);
    res.json({ message: 'List deleted successfully' });
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Reorder lists
// @route   PUT /api/lists/reorder
// @access  Private
export const reorderListsController = async (req, res) => {
  try {
    const { boardId, listIds } = req.body;
    const lists = await reorderLists(boardId, req.user._id, listIds);
    res.json(lists);
  } catch (error) {
    handleServiceError(res, error);
  }
};
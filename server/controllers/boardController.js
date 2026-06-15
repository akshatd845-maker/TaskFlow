import {
  listBoards,
  getBoardById,
  createBoard as createBoardService,
  updateBoard as updateBoardService,
  deleteBoard as deleteBoardService,
  addBoardMember,
  removeBoardMember
} from '../services/boardService.js';
import logger from '../config/logger.js';

// ─── Error Handler ────────────────────────────────────────────────────────────

const handleServiceError = (res, error) => {
  const status = error.statusCode || 500;
  logger.error(error.message, { error: error.stack });
  return res.status(status).json({ message: error.message });
};

// ─── Controllers ──────────────────────────────────────────────────────────────

// @desc    Get all boards for user
// @route   GET /api/boards
// @access  Private
export const getBoards = async (req, res) => {
  try {
    const boards = await listBoards(req.user._id);
    res.json(boards);
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Get single board
// @route   GET /api/boards/:id
// @access  Private
export const getBoard = async (req, res) => {
  try {
    const board = await getBoardById(req.params.id, req.user._id);
    res.json(board);
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Create new board
// @route   POST /api/boards
// @access  Private
export const createBoard = async (req, res) => {
  try {
    const { name, description, background } = req.body;
    const board = await createBoardService(req.user._id, { name, description, background });
    res.status(201).json(board);
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Update board
// @route   PUT /api/boards/:id
// @access  Private
export const updateBoard = async (req, res) => {
  try {
    const { name, description, background } = req.body;
    const board = await updateBoardService(req.params.id, req.user._id, { name, description, background });
    res.json(board);
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Delete board
// @route   DELETE /api/boards/:id
// @access  Private
export const deleteBoard = async (req, res) => {
  try {
    await deleteBoardService(req.params.id, req.user._id);
    res.json({ message: 'Board deleted successfully' });
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Add member to board
// @route   POST /api/boards/:id/members
// @access  Private
export const addMember = async (req, res) => {
  try {
    const { email, role } = req.body;
    const board = await addBoardMember(req.params.id, req.user._id, { email, role });
    res.json(board);
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Remove member from board
// @route   DELETE /api/boards/:id/members/:userId
// @access  Private
export const removeMember = async (req, res) => {
  try {
    const board = await removeBoardMember(req.params.id, req.user._id, req.params.userId);
    res.json(board);
  } catch (error) {
    handleServiceError(res, error);
  }
};
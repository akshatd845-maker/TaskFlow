import {
  getCards,
  createCard,
  getCardById,
  updateCard,
  deleteCard,
  moveCard,
  addComment,
  assignUser,
  unassignUser
} from '../services/cardService.js';
import logger from '../config/logger.js';

// ─── Error Handler ────────────────────────────────────────────────────────────

const handleServiceError = (res, error) => {
  const status = error.statusCode || 500;
  logger.error(error.message, { error: error.stack });
  return res.status(status).json({ message: error.message });
};

// ─── Controllers ──────────────────────────────────────────────────────────────

// @desc    Search/filter cards
// @route   GET /api/cards
// @access  Private
export const getCardsController = async (req, res) => {
  try {
    const result = await getCards(req.user._id, req.query);
    res.json(result);
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Create new card
// @route   POST /api/cards
// @access  Private
export const createCardController = async (req, res) => {
  try {
    const card = await createCard(req.user._id, req.body);
    res.status(201).json(card);
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Get single card
// @route   GET /api/cards/:id
// @access  Private
export const getCardController = async (req, res) => {
  try {
    const card = await getCardById(req.params.id, req.user._id);
    res.json(card);
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Update card
// @route   PUT /api/cards/:id
// @access  Private
export const updateCardController = async (req, res) => {
  try {
    const card = await updateCard(req.params.id, req.user._id, req.user.name, req.body);
    res.json(card);
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Delete card
// @route   DELETE /api/cards/:id
// @access  Private
export const deleteCardController = async (req, res) => {
  try {
    await deleteCard(req.params.id, req.user._id);
    res.json({ message: 'Card deleted successfully' });
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Move card to another list
// @route   PUT /api/cards/:id/move
// @access  Private
export const moveCardController = async (req, res) => {
  try {
    const { listId, position } = req.body;
    const card = await moveCard(req.params.id, req.user._id, { listId, position });
    res.json(card);
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Add comment to card
// @route   POST /api/cards/:id/comments
// @access  Private
export const addCommentController = async (req, res) => {
  try {
    const comments = await addComment(req.params.id, req.user._id, req.body.text);
    res.json(comments);
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Assign user to card
// @route   PUT /api/cards/:id/assign
// @access  Private
export const assignUserController = async (req, res) => {
  try {
    const card = await assignUser(req.params.id, req.user._id, req.user.name, req.body.userId);
    res.json(card);
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Unassign user from card
// @route   PUT /api/cards/:id/unassign
// @access  Private
export const unassignUserController = async (req, res) => {
  try {
    const card = await unassignUser(req.params.id, req.user._id, req.body.userId);
    res.json(card);
  } catch (error) {
    handleServiceError(res, error);
  }
};
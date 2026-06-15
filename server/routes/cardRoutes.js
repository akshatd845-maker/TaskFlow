import express from 'express';
import {
  getCardsController as getCards,
  createCardController as createCard,
  getCardController as getCard,
  updateCardController as updateCard,
  deleteCardController as deleteCard,
  moveCardController as moveCard,
  addCommentController as addComment,
  assignUserController as assignUser,
  unassignUserController as unassignUser
} from '../controllers/cardController.js';
import { protect } from '../middleware/auth.js';
import { requireDbConnected } from '../utils/databaseHealth.js';
import { validateObjectId } from '../middleware/validateObjectId.js';
import { validate } from '../middleware/validate.js';
import {
  cardCreateSchema,
  cardUpdateSchema,
  cardQuerySchema,
  cardMoveSchema,
  cardCommentSchema,
  cardAssignSchema
} from '../validators/cardValidator.js';

const router = express.Router();

router.use(protect);
router.use(requireDbConnected);

router.route('/')
  .get(validate(cardQuerySchema, { source: 'query' }), getCards)
  .post(validate(cardCreateSchema), createCard);

router.route('/:id')
  .get(validateObjectId, getCard)
  .put(validateObjectId, validate(cardUpdateSchema), updateCard)
  .delete(validateObjectId, deleteCard);

router.route('/:id/move')
  .put(validateObjectId, validate(cardMoveSchema), moveCard);

router.route('/:id/comments')
  .post(validateObjectId, validate(cardCommentSchema), addComment);

router.route('/:id/assign')
  .put(validateObjectId, validate(cardAssignSchema), assignUser);

router.route('/:id/unassign')
  .put(validateObjectId, validate(cardAssignSchema), unassignUser);

export default router;
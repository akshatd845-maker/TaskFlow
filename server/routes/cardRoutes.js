import express from 'express';
import {
  createCard,
  getCard,
  getCards,
  updateCard,
  deleteCard,
  moveCard,
  addComment,
  assignUser,
  unassignUser
} from '../controllers/cardController.js';
import { protect } from '../middleware/auth.js';
import { requireDbConnected } from '../utils/databaseHealth.js';
import { validateObjectId } from '../middleware/validateObjectId.js';
import { validate } from '../middleware/validate.js';
import { cardCreateSchema, cardUpdateSchema, cardQuerySchema } from '../validators/cardValidator.js';


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
  .put(validateObjectId, moveCard);

router.route('/:id/comments')
  .post(validateObjectId, addComment);

router.route('/:id/assign')
  .put(validateObjectId, assignUser);

router.route('/:id/unassign')
  .put(validateObjectId, unassignUser);

export default router;
import express from 'express';
import {
  getBoards,
  getBoard,
  createBoard,
  updateBoard,
  deleteBoard,
  addMember,
  removeMember
} from '../controllers/boardController.js';
import { protect } from '../middleware/auth.js';
import { requireDbConnected } from '../utils/databaseHealth.js';
import { validateObjectId } from '../middleware/validateObjectId.js';
import { validate } from '../middleware/validate.js';
import { boardCreateSchema, boardUpdateSchema, boardQuerySchema } from '../validators/boardValidator.js';


const router = express.Router();

router.use(protect);
router.use(requireDbConnected);


router.route('/')
  .get(validate(boardQuerySchema, { source: 'query' }), getBoards)
  .post(validate(boardCreateSchema), createBoard);

router.route('/:id')
  .get(validateObjectId, getBoard)
  .put(validateObjectId, validate(boardUpdateSchema), updateBoard)
  .delete(validateObjectId, deleteBoard);

router.route('/:id/members')
  .post(validateObjectId, addMember);

router.route('/:id/members/:userId')
  .delete(validateObjectId, removeMember);

export default router;
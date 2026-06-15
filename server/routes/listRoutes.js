import express from 'express';
import {
  createListController as createList,
  updateListController as updateList,
  deleteListController as deleteList,
  reorderListsController as reorderLists
} from '../controllers/listController.js';
import { protect } from '../middleware/auth.js';
import { requireDbConnected } from '../utils/databaseHealth.js';
import { validateObjectId } from '../middleware/validateObjectId.js';
import { validate } from '../middleware/validate.js';
import { listCreateSchema, listUpdateSchema, listReorderSchema } from '../validators/listValidator.js';


const router = express.Router();

router.use(protect);
router.use(requireDbConnected);

router.route('/')
  .post(validate(listCreateSchema), createList);

router.route('/reorder')
  .put(validate(listReorderSchema), reorderLists);

router.route('/:id')
  .put(validateObjectId, validate(listUpdateSchema), updateList)
  .delete(validateObjectId, deleteList);

export default router;
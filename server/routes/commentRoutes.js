import express from 'express';
import { protect } from '../middleware/auth.js';
import { requireDbConnected } from '../utils/databaseHealth.js';
import { validateObjectId } from '../middleware/validateObjectId.js';
import { validate } from '../middleware/validate.js';
import { commentCreateSchema, commentUpdateSchema, commentQuerySchema } from '../validators/commentValidator.js';

import { createComment, getCommentsByTask, deleteComment } from '../controllers/commentController.js';

const router = express.Router();

router.use(protect);
router.use(requireDbConnected);



router.route('/').post(validate(commentCreateSchema), createComment);
router.route('/task/:taskId').get(validateObjectId, validate(commentQuerySchema, { source: 'query' }), getCommentsByTask);
router.route('/:id').delete(validateObjectId, deleteComment);

export default router;

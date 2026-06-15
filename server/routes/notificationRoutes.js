import express from 'express';
import { protect } from '../middleware/auth.js';
import { requireDbConnected } from '../utils/databaseHealth.js';
import { validateObjectId } from '../middleware/validateObjectId.js';
import { validate } from '../middleware/validate.js';
import { notificationCreateSchema, notificationQuerySchema } from '../validators/notificationValidator.js';

import {
  createNotification,
  getNotifications,
  getUnreadCountController as getUnreadCount,
  markAsRead,
  markAllRead,
  deleteNotification
} from '../controllers/notificationController.js';

const router = express.Router();

router.use(requireDbConnected);
router.route('/').post(protect, validate(notificationCreateSchema), createNotification)
  .get(protect, validate(notificationQuerySchema, { source: 'query' }), getNotifications);

router.route('/unread/count').get(protect, getUnreadCount);
router.route('/read-all').put(protect, markAllRead);
router.route('/:id/read').put(protect, validateObjectId, markAsRead);
router.route('/:id').delete(protect, validateObjectId, deleteNotification);

export default router;

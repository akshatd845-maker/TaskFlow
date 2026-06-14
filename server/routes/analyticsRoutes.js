import express from 'express';
import { protect } from '../middleware/auth.js';
import { requireDbConnected } from '../utils/databaseHealth.js';
import { validateObjectId } from '../middleware/validateObjectId.js';
import { validate } from '../middleware/validate.js';
import { analyticsQuerySchema } from '../validators/analyticsValidator.js';

import {
  getOverview,
  getProjectProgress,
  getTeamProductivity,
  getTaskStatus
} from '../controllers/analyticsController.js';

const router = express.Router();

router.use(protect);
router.use(requireDbConnected);



router.get('/overview', validate(analyticsQuerySchema, { source: 'query' }), getOverview);
router.get('/project-progress', validateObjectId, validate(analyticsQuerySchema, { source: 'query' }), getProjectProgress);
router.get('/team-productivity', validateObjectId, validate(analyticsQuerySchema, { source: 'query' }), getTeamProductivity);
router.get('/task-status', validateObjectId, validate(analyticsQuerySchema, { source: 'query' }), getTaskStatus);

export default router;


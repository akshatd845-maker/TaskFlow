import express from 'express';
import {
  getProjects,
  getProject,
  getProjectMembers,
  createProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
  updateMemberRole,
  getProjectBoard
} from '../controllers/projectController.js';
import { protect } from '../middleware/auth.js';
import { requireDbConnected } from '../utils/databaseHealth.js';
import { validateObjectId } from '../middleware/validateObjectId.js';
import { validate } from '../middleware/validate.js';
import {
  projectCreateSchema,
  projectUpdateSchema,
  projectQuerySchema,
  projectMemberQuerySchema
} from '../validators/projectValidator.js';


const router = express.Router();

// All routes require authentication
router.use(protect);
router.use(requireDbConnected);


// Project CRUD
router.route('/')
  .get(validate(projectQuerySchema, { source: 'query' }), getProjects)
  .post(validate(projectCreateSchema), createProject);

router.route('/:id/board')
  .get(validateObjectId, getProjectBoard);

router.route('/:id')
  .get(validateObjectId, getProject)
  .put(validateObjectId, validate(projectUpdateSchema), updateProject)
  .delete(validateObjectId, deleteProject);

// Member management
router.route('/:id/members')
  .get(validateObjectId, validate(projectMemberQuerySchema, { source: 'query' }), getProjectMembers)
  .post(validateObjectId, addMember);

router.route('/:id/members/:userId')
  .put(validateObjectId, updateMemberRole)
  .delete(validateObjectId, removeMember);

export default router;
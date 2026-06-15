import {
  listProjects,
  getProjectById,
  getProjectMembers,
  createProject,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  updateProjectMemberRole,
  getOrCreateProjectBoard
} from '../services/projectService.js';
import logger from '../config/logger.js';

// ─── Error Handler ────────────────────────────────────────────────────────────

const handleServiceError = (res, error) => {
  const status = error.statusCode || 500;
  logger.error(error.message, { error: error.stack });
  return res.status(status).json({ message: error.message });
};

// ─── Controllers ──────────────────────────────────────────────────────────────

// @desc    Get all projects for user
// @route   GET /api/projects
// @access  Private
export const getProjects = async (req, res) => {
  try {
    const result = await listProjects(req.user._id, req.query);
    res.json(result);
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
export const getProject = async (req, res) => {
  try {
    const project = await getProjectById(req.params.id, req.user._id);
    res.json(project);
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Get project members (team)
// @route   GET /api/projects/:id/members
// @access  Private
export const getProjectMembersController = async (req, res) => {
  try {
    const result = await getProjectMembers(req.params.id, req.user._id, req.query);
    res.json(result);
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Create new project
// @route   POST /api/projects
// @access  Private
export const createProjectController = async (req, res) => {
  try {
    const project = await createProject(req.user._id, req.user.name, req.body);
    res.status(201).json(project);
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
export const updateProjectController = async (req, res) => {
  try {
    const project = await updateProject(req.params.id, req.user._id, req.body);
    res.json(project);
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
export const deleteProjectController = async (req, res) => {
  try {
    await deleteProject(req.params.id, req.user._id);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Add member to project
// @route   POST /api/projects/:id/members
// @access  Private
export const addMember = async (req, res) => {
  try {
    const project = await addProjectMember(
      req.params.id,
      req.user._id,
      req.user.name,
      req.body
    );
    res.status(201).json(project);
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Remove member from project
// @route   DELETE /api/projects/:id/members/:userId
// @access  Private
export const removeMember = async (req, res) => {
  try {
    const project = await removeProjectMember(
      req.params.id,
      req.user._id,
      req.params.userId
    );
    res.json(project);
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Update member role
// @route   PUT /api/projects/:id/members/:userId
// @access  Private
export const updateMemberRole = async (req, res) => {
  try {
    const project = await updateProjectMemberRole(
      req.params.id,
      req.user._id,
      req.params.userId,
      req.body.role
    );
    res.json(project);
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Get or create board for project
// @route   GET /api/projects/:id/board
// @access  Private
export const getProjectBoard = async (req, res) => {
  try {
    const result = await getOrCreateProjectBoard(req.params.id, req.user._id);
    res.json(result);
  } catch (error) {
    handleServiceError(res, error);
  }
};

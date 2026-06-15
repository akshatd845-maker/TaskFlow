/**
 * Centralized Authorization Service
 *
 * Single source of truth for all authorization checks across the application.
 * Eliminates duplicated permission checks found in controllers.
 *
 * Uses projectPermissions.js for project-level authorization.
 * Provides board and card authorization for nested resources.
 */

import Project from '../models/Project.js';
import Board from '../models/Board.js';
import List from '../models/List.js';
import Card from '../models/Card.js';
import {
  getEffectiveRoleForUser,
  hasPermission,
  EFFECTIVE_ROLES
} from './projectPermissions.js';

/**
 * Authorization types for different resources
 */
export const AUTH_TYPES = {
  PROJECT: 'project',
  BOARD: 'board',
  LIST: 'list',
  CARD: 'card'
};

/**
 * Authorization result object
 */
export class AuthResult {
  constructor(authorized, userRole = null, resource = null, message = null) {
    this.authorized = authorized;
    this.userRole = userRole;
    this.resource = resource;
    this.message = message;
  }

  static allowed(role, resource = null) {
    return new AuthResult(true, role, resource);
  }

  static denied(message = 'Not authorized') {
    return new AuthResult(false, null, null, message);
  }
}

/**
 * Check if user has access to a project
 * @param {string} projectId - MongoDB ObjectId
 * @param {string} userId - MongoDB ObjectId
 * @returns {Promise<AuthResult>}
 */
export const authorizeProjectAccess = async (projectId, userId) => {
  try {
    const project = await Project.findById(projectId);

    if (!project) {
      return AuthResult.denied('Project not found');
    }

    const effectiveRole = getEffectiveRoleForUser(project, userId);

    if (!effectiveRole) {
      return AuthResult.denied('Not authorized to access this project');
    }

    return AuthResult.allowed(effectiveRole, project);
  } catch (error) {
    if (error.name === 'CastError') {
      return AuthResult.denied('Invalid project ID');
    }
    throw error;
  }
};

/**
 * Check if user has specific permission on a project
 * @param {string} projectId - MongoDB ObjectId
 * @param {string} userId - MongoDB ObjectId
 * @param {string} permission - Permission name from projectPermissions.js
 * @returns {Promise<AuthResult>}
 */
export const authorizeProjectPermission = async (projectId, userId, permission) => {
  const accessResult = await authorizeProjectAccess(projectId, userId);

  if (!accessResult.authorized) {
    return accessResult;
  }

  if (!hasPermission(accessResult.userRole, permission)) {
    return AuthResult.denied(`Missing permission: ${permission}`);
  }

  return AuthResult.allowed(accessResult.userRole, accessResult.resource);
};

/**
 * Check if user has access to a board
 * @param {string} boardId - MongoDB ObjectId
 * @param {string} userId - MongoDB ObjectId
 * @returns {Promise<AuthResult>}
 */
export const authorizeBoardAccess = async (boardId, userId) => {
  try {
    const board = await Board.findById(boardId);

    if (!board) {
      return AuthResult.denied('Board not found');
    }

    // Board owner has full access
    const ownerId = board.owner?._id ? board.owner._id.toString() : board.owner.toString();
    if (ownerId === userId.toString()) {
      return AuthResult.allowed(EFFECTIVE_ROLES.OWNER, board);
    }

    // Check if user is a board member
    const member = board.members?.find(m => {
      const memberId = m.user?._id ? m.user._id.toString() : m.user.toString();
      return memberId === userId.toString();
    });

    if (!member) {
      return AuthResult.denied('Not a member of this board');
    }

    const role = member.role === 'admin' ? EFFECTIVE_ROLES.ADMIN : EFFECTIVE_ROLES.MEMBER;
    return AuthResult.allowed(role, board);
  } catch (error) {
    if (error.name === 'CastError') {
      return AuthResult.denied('Invalid board ID');
    }
    throw error;
  }
};

/**
 * Check if user has access to a list (via board)
 * @param {string} listId - MongoDB ObjectId
 * @param {string} userId - MongoDB ObjectId
 * @returns {Promise<AuthResult>}
 */
export const authorizeListAccess = async (listId, userId) => {
  try {
    const list = await List.findById(listId).populate('board');

    if (!list) {
      return AuthResult.denied('List not found');
    }

    return authorizeBoardAccess(list.board._id, userId);
  } catch (error) {
    if (error.name === 'CastError') {
      return AuthResult.denied('Invalid list ID');
    }
    throw error;
  }
};

/**
 * Check if user has access to a card (via list -> board)
 * @param {string} cardId - MongoDB ObjectId
 * @param {string} userId - MongoDB ObjectId
 * @returns {Promise<AuthResult>}
 */
export const authorizeCardAccess = async (cardId, userId) => {
  try {
    const card = await Card.findById(cardId);

    if (!card) {
      return AuthResult.denied('Card not found');
    }

    return authorizeListAccess(card.list, userId);
  } catch (error) {
    if (error.name === 'CastError') {
      return AuthResult.denied('Invalid card ID');
    }
    throw error;
  }
};

/**
 * Middleware factory for project authorization
 * @param {string} permission - Required permission (optional)
 * @returns {Function} Express middleware
 */
export const requireProjectAuth = (permission = null) => {
  return async (req, res, next) => {
    const userId = req.user._id;
    const projectId = req.params.id || req.body.projectId;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required',
        errors: []
      });
    }

    const result = permission
      ? await authorizeProjectPermission(projectId, userId, permission)
      : await authorizeProjectAccess(projectId, userId);

    if (!result.authorized) {
      return res.status(403).json({
        success: false,
        message: result.message,
        errors: []
      });
    }

    // Attach to request for downstream use
    req.projectAuth = {
      role: result.userRole,
      project: result.resource
    };

    next();
  };
};

/**
 * Middleware factory for board authorization
 * @returns {Function} Express middleware
 */
export const requireBoardAuth = () => {
  return async (req, res, next) => {
    const userId = req.user._id;
    const boardId = req.params.id || req.body.boardId;

    if (!boardId) {
      return res.status(400).json({
        success: false,
        message: 'Board ID is required',
        errors: []
      });
    }

    const result = await authorizeBoardAccess(boardId, userId);

    if (!result.authorized) {
      return res.status(403).json({
        success: false,
        message: result.message,
        errors: []
      });
    }

    req.boardAuth = {
      role: result.userRole,
      board: result.resource
    };

    next();
  };
};

/**
 * Middleware factory for card authorization
 * @returns {Function} Express middleware
 */
export const requireCardAuth = () => {
  return async (req, res, next) => {
    const userId = req.user._id;
    const cardId = req.params.id || req.body.cardId;

    if (!cardId) {
      return res.status(400).json({
        success: false,
        message: 'Card ID is required',
        errors: []
      });
    }

    const result = await authorizeCardAccess(cardId, userId);

    if (!result.authorized) {
      return res.status(403).json({
        success: false,
        message: result.message,
        errors: []
      });
    }

    req.cardAuth = {
      role: result.userRole,
      card: result.resource
    };

    next();
  };
};

export { EFFECTIVE_ROLES, hasPermission };
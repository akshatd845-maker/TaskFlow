import Project from '../models/Project.js';
import Board from '../models/Board.js';
import List from '../models/List.js';
import Card from '../models/Card.js';
import Comment from '../models/Comment.js';
import Task from '../models/Task.js';
import projectRepository from '../repositories/projectRepository.js';
import boardRepository from '../repositories/boardRepository.js';
import listRepository from '../repositories/listRepository.js';
import userRepository from '../repositories/userRepository.js';
import {
  getEffectiveRoleForUser,
  hasPermission,
  EFFECTIVE_ROLES,
  VALID_MEMBER_ROLES
} from '../utils/projectPermissions.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { notify } from './notificationService.js';

// ─── Internal Helpers ─────────────────────────────────────────────────────────

const DEFAULT_LISTS = ['Todo', 'In Progress', 'Review', 'Done'];

/**
 * Creates a Kanban board + default lists for a newly-created project.
 */
const createBoardForProject = async (project, userId) => {
  const board = await Board.create({
    name: project.title,
    description: project.description || '',
    owner: userId,
    project: project._id,
    background: project.color || '#6366f1',
    members: []
  });

  // Create all default lists in a single DB round-trip
  const listsData = DEFAULT_LISTS.map((name, i) => ({
    name,
    board: board._id,
    position: i,
    cards: []
  }));
  const createdLists = await List.insertMany(listsData);
  board.lists = createdLists.map((l) => l._id);
  await board.save();
  return board;
};

/**
 * Decorates project objects with their associated boardId.
 */
const attachBoardIds = async (projects) => {
  const ids = projects.map((p) => p._id);
  const boards = await Board.find({ project: { $in: ids } }).select('_id project');
  const boardByProject = new Map(boards.map((b) => [String(b.project), b._id]));
  return projects.map((p) => {
    const obj = p.toObject ? p.toObject() : { ...p };
    obj.boardId = boardByProject.get(String(p._id)) || null;
    return obj;
  });
};

// ─── Service Methods ──────────────────────────────────────────────────────────

/**
 * Returns a paginated list of projects the user owns or is a member of.
 */
export const listProjects = async (userId, { search, page = 1, limit = 10, sort } = {}) => {
  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const skip = (parsedPage - 1) * parsedLimit;

  const query = {
    $or: [{ owner: userId }, { 'members.user': userId }],
    isArchived: { $ne: true }
  };

  if (search && typeof search === 'string' && search.trim()) {
    const term = escapeRegex(search.trim());
    query.$and = [{
      $or: [
        { title: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } }
      ]
    }];
  }

  const sortOption = (() => {
    switch (String(sort || 'newest').toLowerCase()) {
      case 'oldest':      return { createdAt: 1 };
      case 'alphabetical': return { title: 1 };
      default:            return { createdAt: -1 };
    }
  })();

  const totalItems = await projectRepository.count(query);
  const totalPages = Math.max(Math.ceil(totalItems / parsedLimit) || 1, 1);

  const projects = await projectRepository.find(query, sortOption, skip, parsedLimit);
  const data = await attachBoardIds(projects);

  return { data, page: parsedPage, totalPages, totalItems };
};

/**
 * Returns a single project if the requesting user has access.
 */
export const getProjectById = async (projectId, userId) => {
  const project = await Project.findById(projectId)
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar');

  if (!project) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }

  const effectiveRole = getEffectiveRoleForUser(project, userId);
  if (!effectiveRole) {
    const err = new Error('Not authorized to view this project');
    err.statusCode = 403;
    throw err;
  }

  const [withBoard] = await attachBoardIds([project]);
  return withBoard;
};

/**
 * Returns paginated members of a project the requester has access to.
 */
export const getProjectMembers = async (
  projectId,
  userId,
  { memberSearch, role, page = 1, limit = 10, sort } = {}
) => {
  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const skip = (parsedPage - 1) * parsedLimit;

  const project = await projectRepository.findById(projectId);
  if (!project) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }

  // Need populated owner/members for permission check
  await project.populate('owner', 'name email avatar');
  await project.populate('members.user', 'name email avatar');

  const effectiveRole = getEffectiveRoleForUser(project, userId);
  if (!effectiveRole) {
    const err = new Error('Not authorized to view this team');
    err.statusCode = 403;
    throw err;
  }

  const ownerObj = {
    _id: project.owner._id,
    name: project.owner.name,
    email: project.owner.email,
    avatar: project.owner.avatar,
    role: EFFECTIVE_ROLES.OWNER
  };

  const memberObjs = (project.members || []).map((m) => ({
    _id: m.user._id,
    name: m.user.name,
    email: m.user.email,
    avatar: m.user.avatar,
    role: m.role === 'admin' ? EFFECTIVE_ROLES.ADMIN : EFFECTIVE_ROLES.MEMBER
  }));

  let all = [ownerObj, ...memberObjs];

  if (memberSearch && typeof memberSearch === 'string' && memberSearch.trim()) {
    const term = memberSearch.trim().toLowerCase();
    all = all.filter(
      (m) =>
        (m.name || '').toLowerCase().includes(term) ||
        (m.email || '').toLowerCase().includes(term)
    );
  }

  if (role) {
    const roleMap = {
      owner: EFFECTIVE_ROLES.OWNER,
      admin: EFFECTIVE_ROLES.ADMIN,
      member: EFFECTIVE_ROLES.MEMBER
    };
    const normalizedRole = roleMap[String(role).toLowerCase()] || role;
    all = all.filter(
      (m) => String(m.role).toLowerCase() === String(normalizedRole).toLowerCase()
    );
  }

  all = all.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const totalItems = all.length;
  const totalPages = Math.max(Math.ceil(totalItems / parsedLimit) || 1, 1);
  const paged = all.slice(skip, skip + parsedLimit);

  return { data: paged, page: parsedPage, totalPages, totalItems };
};

/**
 * Creates a new project along with its default Kanban board.
 */
export const createProject = async (userId, actorName, { title, description, status, color }) => {
  if (!title) {
    const err = new Error('Project title is required');
    err.statusCode = 400;
    throw err;
  }

  const project = await projectRepository.create({
    title,
    description: description || '',
    owner: userId,
    members: [],
    status: status || 'active',
    color: color || '#3b82f6'
  });

  await project.populate('owner', 'name email avatar');
  await createBoardForProject(project, userId);

  // Non-blocking notification
  notify({
    userId: project.owner._id || project.owner,
    actorId: userId,
    type: 'project_created',
    message: `${actorName} created project ${project.title}`,
    referenceId: project._id
  });

  const [withBoard] = await attachBoardIds([project]);
  return withBoard;
};

/**
 * Updates project fields. Owner or admin only.
 */
export const updateProject = async (projectId, userId, fields) => {
  const project = await projectRepository.findById(projectId);
  if (!project) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }

  const effectiveRole = getEffectiveRoleForUser(project, userId);
  if (!effectiveRole || !hasPermission(effectiveRole, 'editProject')) {
    const err = new Error('Not authorized to update this project');
    err.statusCode = 403;
    throw err;
  }

  const { title, description, status, color, isArchived } = fields;
  if (title) project.title = title;
  if (description !== undefined) project.description = description;
  if (status) project.status = status;
  if (color) project.color = color;
  if (isArchived !== undefined) project.isArchived = isArchived;

  const updatedProject = await project.save();
  await updatedProject.populate('owner', 'name email avatar');
  await updatedProject.populate('members.user', 'name email avatar');

  return updatedProject;
};

/**
 * Deletes a project and cascades deletion to boards, lists, cards, and comments.
 * Owner only.
 */
export const deleteProject = async (projectId, userId) => {
  const project = await projectRepository.findById(projectId);
  if (!project) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }

  const effectiveRole = getEffectiveRoleForUser(project, userId);
  if (!effectiveRole || !hasPermission(effectiveRole, 'deleteProject')) {
    const err = new Error('Only owner can delete this project');
    err.statusCode = 403;
    throw err;
  }

  await Task.deleteMany({ projectId: project._id });

  const board = await Board.findOne({ project: project._id });
  if (board) {
    const listIds = await List.find({ board: board._id }).distinct('_id');
    if (listIds.length) {
      const cardIds = await Card.find({ list: { $in: listIds } }).distinct('_id');
      if (cardIds.length) {
        await Comment.deleteMany({ taskId: { $in: cardIds } });
      }
      await Card.deleteMany({ list: { $in: listIds } });
    }
    await List.deleteMany({ board: board._id });
    await board.deleteOne();
  }

  await project.deleteOne();
};

/**
 * Adds a user (found by email) as a project member.
 */
export const addProjectMember = async (projectId, actorId, actorName, { email, role }) => {
  if (!email || typeof email !== 'string') {
    const err = new Error('Member email is required');
    err.statusCode = 400;
    throw err;
  }

  const project = await projectRepository.findById(projectId);
  if (!project) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }

  await project.populate('owner', 'name email avatar');

  const effectiveRole = getEffectiveRoleForUser(project, actorId);
  if (!effectiveRole || !hasPermission(effectiveRole, 'inviteMembers')) {
    const err = new Error('Not authorized to invite members');
    err.statusCode = 403;
    throw err;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const targetUser = await userRepository.findByEmail(normalizedEmail);
  if (!targetUser) {
    const err = new Error('User not found with this email');
    err.statusCode = 404;
    throw err;
  }

  const isAlreadyMember =
    String(project.owner._id || project.owner) === String(targetUser._id) ||
    (project.members || []).some((m) => String(m.user) === String(targetUser._id));

  if (isAlreadyMember) {
    const err = new Error('User is already a member of this project');
    err.statusCode = 400;
    throw err;
  }

  const requestedRole = role ? String(role).toLowerCase() : 'member';
  if (!VALID_MEMBER_ROLES.includes(requestedRole)) {
    const err = new Error('Invalid role. Allowed: admin, member');
    err.statusCode = 400;
    throw err;
  }

  project.members.push({ user: targetUser._id, role: requestedRole, joinedAt: new Date() });
  await project.save();

  const updated = await projectRepository.findById(project._id);
  await updated.populate('owner', 'name email avatar');
  await updated.populate('members.user', 'name email avatar');
  const [withBoard] = await attachBoardIds([updated]);

  notify({
    userId: targetUser._id,
    actorId,
    type: 'custom',
    message: `${actorName} added you to project ${project.title}`,
    referenceId: project._id
  });

  return withBoard;
};

/**
 * Removes a member from a project. Cannot remove the owner.
 */
export const removeProjectMember = async (projectId, actorId, memberId) => {
  const project = await projectRepository.findById(projectId);
  if (!project) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }

  await project.populate('owner', 'name email avatar');
  await project.populate('members.user', 'name email avatar');

  const effectiveRole = getEffectiveRoleForUser(project, actorId);
  if (!effectiveRole || !hasPermission(effectiveRole, 'removeMembers')) {
    const err = new Error('Not authorized to remove members');
    err.statusCode = 403;
    throw err;
  }

  if (String(project.owner._id || project.owner) === String(memberId)) {
    const err = new Error('Cannot remove project owner');
    err.statusCode = 400;
    throw err;
  }

  const beforeCount = (project.members || []).length;
  project.members = (project.members || []).filter(
    (m) => String(m.user._id || m.user) !== String(memberId)
  );

  if (project.members.length === beforeCount) {
    const err = new Error('Member not found in this project');
    err.statusCode = 404;
    throw err;
  }

  await project.save();

  const updated = await projectRepository.findById(project._id);
  await updated.populate('owner', 'name email avatar');
  await updated.populate('members.user', 'name email avatar');
  const [withBoard] = await attachBoardIds([updated]);
  return withBoard;
};

/**
 * Changes the role of an existing project member.
 */
export const updateProjectMemberRole = async (projectId, actorId, memberId, role) => {
  if (!role || typeof role !== 'string') {
    const err = new Error('Role is required');
    err.statusCode = 400;
    throw err;
  }

  const requestedRole = String(role).toLowerCase();
  if (!VALID_MEMBER_ROLES.includes(requestedRole)) {
    const err = new Error('Invalid role. Allowed: admin, member');
    err.statusCode = 400;
    throw err;
  }

  const project = await projectRepository.findById(projectId);
  if (!project) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }

  await project.populate('owner', 'name email avatar');
  await project.populate('members.user', 'name email avatar');

  const effectiveRole = getEffectiveRoleForUser(project, actorId);
  if (!effectiveRole || !hasPermission(effectiveRole, 'changeRoles')) {
    const err = new Error('Not authorized to update member role');
    err.statusCode = 403;
    throw err;
  }

  if (String(project.owner._id || project.owner) === String(memberId)) {
    const err = new Error('Cannot change owner role');
    err.statusCode = 400;
    throw err;
  }

  const memberIndex = (project.members || []).findIndex(
    (m) => String(m.user._id || m.user) === String(memberId)
  );

  if (memberIndex === -1) {
    const err = new Error('Member not found in this project');
    err.statusCode = 404;
    throw err;
  }

  project.members[memberIndex].role = requestedRole;
  await project.save();

  const updated = await projectRepository.findById(project._id);
  await updated.populate('owner', 'name email avatar');
  await updated.populate('members.user', 'name email avatar');
  const [withBoard] = await attachBoardIds([updated]);
  return withBoard;
};

/**
 * Returns (or lazily creates) the Kanban board for a project.
 */
export const getOrCreateProjectBoard = async (projectId, userId) => {
  const project = await projectRepository.findById(projectId);
  if (!project) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }

  const effectiveRole = getEffectiveRoleForUser(project, userId);
  if (!effectiveRole) {
    const err = new Error('Not authorized to view this project board');
    err.statusCode = 403;
    throw err;
  }

  let board = await Board.findOne({ project: project._id });
  if (!board) {
    board = await createBoardForProject(project, project.owner);
  }

  return { boardId: board._id };
};



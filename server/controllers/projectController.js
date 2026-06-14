import Project from '../models/Project.js';
import Board from '../models/Board.js';
import List from '../models/List.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { getIO } from '../socket.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import {
  EFFECTIVE_ROLES,
  getEffectiveRoleForUser,
  hasPermission,
  VALID_MEMBER_ROLES
} from '../utils/projectPermissions.js';

const DEFAULT_LISTS = ['Todo', 'In Progress', 'Review', 'Done'];

const createBoardForProject = async (project, userId) => {
  const board = await Board.create({
    name: project.title,
    description: project.description || '',
    owner: userId,
    project: project._id,
    background: project.color || '#6366f1',
    members: []
  });

  for (let i = 0; i < DEFAULT_LISTS.length; i++) {
    const list = await List.create({
      name: DEFAULT_LISTS[i],
      board: board._id,
      position: i,
      cards: []
    });
    board.lists.push(list._id);
  }
  await board.save();
  return board;
};

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

// @desc    Get all projects for user
// @route   GET /api/projects
// @access  Private
export const getProjects = async (req, res) => {
  try {
    const { search, page = 1, limit = 10, sort } = req.query;

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const skip = (parsedPage - 1) * parsedLimit;

    const query = {
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ],
      isArchived: { $ne: true }
    };

    if (search && typeof search === 'string' && search.trim()) {
      const term = escapeRegex(search.trim());
      query.$and = [
        {
          $or: [
            { title: { $regex: term, $options: 'i' } },
            { description: { $regex: term, $options: 'i' } }
          ]
        }
      ];
    }

    const sortOption = (() => {
      const s = String(sort || 'newest').toLowerCase();
      switch (s) {
        case 'oldest':
          return { createdAt: 1 };
        case 'alphabetical':
          return { title: 1 };
        case 'newest':
        default:
          return { createdAt: -1 };
      }
    })();

    const totalItems = await Project.countDocuments(query);
    const totalPages = Math.max(Math.ceil(totalItems / parsedLimit) || 1, 1);

    const projects = await Project.find(query)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .sort(sortOption)
      .skip(skip)
      .limit(parsedLimit);

    const data = await attachBoardIds(projects);

    res.json({
      data,
      page: parsedPage,
      totalPages,
      totalItems
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
export const getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const effectiveRole = getEffectiveRoleForUser(project, req.user._id);
    if (!effectiveRole) {
      return res.status(403).json({ message: 'Not authorized to view this project' });
    }

    const [withBoard] = await attachBoardIds([project]);
    res.json(withBoard);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get project members (team)
// @route   GET /api/projects/:id/members
// @access  Private
export const getProjectMembers = async (req, res) => {
  try {
    const { memberSearch, role, page = 1, limit = 10, sort } = req.query;

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const skip = (parsedPage - 1) * parsedLimit;

    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const effectiveRole = getEffectiveRoleForUser(project, req.user._id);
    if (!effectiveRole) {
      return res.status(403).json({ message: 'Not authorized to view this team' });
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

    // Normalize role values to support role filtering on {owner|admin|member}
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
      const r = String(role).toLowerCase();
      const roleMap = {
        owner: EFFECTIVE_ROLES.OWNER,
        admin: EFFECTIVE_ROLES.ADMIN,
        member: EFFECTIVE_ROLES.MEMBER
      };
      const normalizedRole = roleMap[r] || r;
      all = all.filter((m) => String(m.role).toLowerCase() === String(normalizedRole).toLowerCase());
    }

    const sortOption = (() => {
      const s = String(sort || 'alphabetical').toLowerCase();
      // Only alphabetical makes sense for members list; other values keep current order.
      if (s === 'alphabetical') return (a, b) => (a.name || '').localeCompare(b.name || '');
      return (a, b) => (a.name || '').localeCompare(b.name || '');
    })();


    all = all.slice().sort(sortOption);

    const totalItems = all.length;
    const totalPages = Math.max(Math.ceil(totalItems / parsedLimit) || 1, 1);
    const paged = all.slice(skip, skip + parsedLimit);

    res.json({ data: paged, page: parsedPage, totalPages, totalItems });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new project
// @route   POST /api/projects
// @access  Private
export const createProject = async (req, res) => {
  try {
    const { title, description, status, color } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({ message: 'Project title is required' });
    }

    const project = await Project.create({
      title,
      description: description || '',
      owner: req.user._id,
      members: [],
      status: status || 'active',
      color: color || '#3b82f6'
    });

    await project.populate('owner', 'name email avatar');
    await createBoardForProject(project, req.user._id);

    // Create notification (for owner or team)
    try {
      const n = await Notification.create({
        user: project.owner,
        actor: req.user._id,
        type: 'project_created',
        message: `${req.user.name} created project ${project.title}`,
        referenceId: project._id
      });
      try {
        const io = getIO();
        if (io) io.to(`user:${project.owner.toString()}`).emit('notification', n);
      } catch (e) {
        console.error('Notification emit error', e.message);
      }
    } catch (e) {
      console.error('Notification creation failed', e.message);
    }

    const [withBoard] = await attachBoardIds([project]);
    res.status(201).json(withBoard);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
export const updateProject = async (req, res) => {
  try {
    const { title, description, status, color, isArchived } = req.body;

    let project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const effectiveRole = getEffectiveRoleForUser(project, req.user._id);
    if (!effectiveRole || !hasPermission(effectiveRole, 'editProject')) {
      return res.status(403).json({ message: 'Not authorized to update this project' });
    }

    project.title = title || project.title;
    project.description = description !== undefined ? description : project.description;
    project.status = status || project.status;
    project.color = color || project.color;
    if (isArchived !== undefined) project.isArchived = isArchived;

    const updatedProject = await project.save();
    await updatedProject.populate('owner', 'name email avatar');
    await updatedProject.populate('members.user', 'name email avatar');

    res.json(updatedProject);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const effectiveRole = getEffectiveRoleForUser(project, req.user._id);
    if (!effectiveRole || !hasPermission(effectiveRole, 'deleteProject')) {
      return res.status(403).json({ message: 'Only owner can delete this project' });
    }

    const { default: Task } = await import('../models/Task.js');
    const { default: Card } = await import('../models/Card.js');
    const { default: Comment } = await import('../models/Comment.js');

    await Task.deleteMany({ projectId: project._id });

    const board = await Board.findOne({ project: project._id });
    if (board) {
      const listIds = await List.find({ board: board._id }).distinct('_id');
      const cardIds = listIds.length
        ? await Card.find({ list: { $in: listIds } }).distinct('_id')
        : [];
      if (cardIds.length) {
        await Comment.deleteMany({ taskId: { $in: cardIds } });
      }
      await Card.deleteMany({ list: { $in: listIds } });
      await List.deleteMany({ board: board._id });
      await board.deleteOne();
    }

    await project.deleteOne();

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add member to project
// @route   POST /api/projects/:id/members
// @access  Private
export const addMember = async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Member email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const effectiveRole = await (async () => {
      const project = await Project.findById(req.params.id).populate('owner', 'name email avatar');
      if (!project) return null;
      return getEffectiveRoleForUser(project, req.user._id);
    })();

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (!effectiveRole) {
      return res.status(403).json({ message: 'Not authorized to add members' });
    }

    const perm = hasPermission(effectiveRole, 'inviteMembers');
    if (!perm) {
      return res.status(403).json({ message: 'Not authorized to invite members' });
    }

    const targetUser = await User.findOne({ email: normalizedEmail });
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found with this email' });
    }

    const isAlreadyMember =
      String(project.owner) === String(targetUser._id) ||
      (project.members || []).some((m) => String(m.user) === String(targetUser._id));

    if (isAlreadyMember) {
      return res.status(400).json({ message: 'User is already a member of this project' });
    }

    const requestedRole = role ? String(role).toLowerCase() : 'member';
    if (!VALID_MEMBER_ROLES.includes(requestedRole)) {
      return res.status(400).json({ message: 'Invalid role. Allowed: admin, member' });
    }

    project.members.push({
      user: targetUser._id,
      role: requestedRole,
      joinedAt: new Date()
    });

    await project.save();

    const updated = await Project.findById(project._id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');
    const [withBoard] = await attachBoardIds([updated]);

    try {
      const n = await Notification.create({
        user: targetUser._id,
        actor: req.user._id,
        type: 'custom',
        message: `${req.user.name} added you to project ${project.title}`,
        referenceId: project._id
      });
      const io = getIO();
      if (io) io.to(`user:${targetUser._id.toString()}`).emit('notification', n);
    } catch (e) {
      console.error('Member notification failed', e.message);
    }

    return res.status(201).json(withBoard);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove member from project
// @route   DELETE /api/projects/:id/members/:userId
// @access  Private
export const removeMember = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate('owner', 'name email avatar').populate('members.user', 'name email avatar');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const effectiveRole = getEffectiveRoleForUser(project, req.user._id);
    if (!effectiveRole) {
      return res.status(403).json({ message: 'Not authorized to remove members' });
    }

    const perm = hasPermission(effectiveRole, 'removeMembers');
    if (!perm) {
      return res.status(403).json({ message: 'Not authorized to remove members' });
    }

    // Cannot remove owner
    if (String(project.owner._id) === String(req.params.userId)) {
      return res.status(400).json({ message: 'Cannot remove project owner' });
    }

    const beforeCount = (project.members || []).length;

    project.members = (project.members || []).filter(
      (member) => String(member.user._id) !== String(req.params.userId)
    );

    const afterCount = (project.members || []).length;
    if (afterCount === beforeCount) {
      return res.status(404).json({ message: 'Member not found in this project' });
    }

    await project.save();

    const updated = await Project.findById(project._id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');
    const [withBoard] = await attachBoardIds([updated]);

    return res.json(withBoard);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update member role
// @route   PUT /api/projects/:id/members/:userId
// @access  Private
export const updateMemberRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!role || typeof role !== 'string') {
      return res.status(400).json({ message: 'Role is required' });
    }

    const requestedRole = String(role).toLowerCase();
    if (!VALID_MEMBER_ROLES.includes(requestedRole)) {
      return res.status(400).json({ message: 'Invalid role. Allowed: admin, member' });
    }

    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const effectiveRole = getEffectiveRoleForUser(project, req.user._id);
    if (!effectiveRole) {
      return res.status(403).json({ message: 'Not authorized to update member role' });
    }

    const perm = hasPermission(effectiveRole, 'changeRoles');
    if (!perm) {
      return res.status(403).json({ message: 'Not authorized to update member role' });
    }

    // Cannot change owner role
    if (String(project.owner._id) === String(req.params.userId)) {
      return res.status(400).json({ message: 'Cannot change owner role' });
    }

    const memberIndex = (project.members || []).findIndex(
      (m) => String(m.user._id) === String(req.params.userId)
    );

    if (memberIndex === -1) {
      return res.status(404).json({ message: 'Member not found in this project' });
    }

    // Admin cannot change owner role (already covered). Admin can change member/admin/member roles.
    // Member effectiveRole will have changeRoles=false.
    project.members[memberIndex].role = requestedRole;

    await project.save();

    const updated = await Project.findById(project._id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');
    const [withBoard] = await attachBoardIds([updated]);

    return res.json(withBoard);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get or create board for project
// @route   GET /api/projects/:id/board
// @access  Private
export const getProjectBoard = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const effectiveRole = getEffectiveRoleForUser(project, req.user._id);
    if (!effectiveRole) {
      return res.status(403).json({ message: 'Not authorized to view this project board' });
    }

    let board = await Board.findOne({ project: project._id });
    if (!board) {
      board = await createBoardForProject(project, project.owner);
    }

    res.json({ boardId: board._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

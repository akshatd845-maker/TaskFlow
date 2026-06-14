import Board from '../models/Board.js';
import List from '../models/List.js';
import Card from '../models/Card.js';

// @desc    Get all boards for user
// @route   GET /api/boards
// @access  Private
export const getBoards = async (req, res) => {
  try {
    const boards = await Board.find({
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ],
      isArchived: false
    })
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .sort({ updatedAt: -1 });

    res.json(boards);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single board
// @route   GET /api/boards/:id
// @access  Private
export const getBoard = async (req, res) => {
  try {
    // H6 FIX: Auth check first with a lean board (no deep populate), then
    // fetch the full board only if authorized. Add field projections to
    // avoid sending every subdocument field over the wire.
    const boardMeta = await Board.findById(req.params.id)
      .select('owner members isArchived')
      .lean();

    if (!boardMeta) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const isOwner = boardMeta.owner.toString() === req.user._id.toString();
    const isMember = boardMeta.members.some(
      (m) => m.user.toString() === req.user._id.toString()
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'Not authorized to view this board' });
    }

    // Now fetch the full board with projections limiting card fields
    const board = await Board.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .populate({
        path: 'lists',
        options: { sort: { position: 1 } },
        populate: {
          path: 'cards',
          select: 'title description priority status labels dueDate assignedTo position isArchived checklist',
          match: { isArchived: { $ne: true } },
          options: { sort: { position: 1 } },
          populate: {
            path: 'assignedTo',
            select: 'name email avatar'
          }
        }
      });

    res.json(board);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new board
// @route   POST /api/boards
// @access  Private
export const createBoard = async (req, res) => {
  try {
    const { name, description, background } = req.body;

    const board = await Board.create({
      name,
      description,
      background,
      owner: req.user._id,
      members: []
    });

    await board.populate('owner', 'name email avatar');

    res.status(201).json(board);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update board
// @route   PUT /api/boards/:id
// @access  Private
export const updateBoard = async (req, res) => {
  try {
    const { name, description, background } = req.body;

    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    // Check if user is owner or admin
    const isOwner = board.owner.toString() === req.user._id.toString();
    const isAdmin = board.members.some(
      member => member.user.toString() === req.user._id.toString() && member.role === 'admin'
    );

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to update this board' });
    }

    board.name = name || board.name;
    board.description = description || board.description;
    board.background = background || board.background;

    const updatedBoard = await board.save();
    await updatedBoard.populate('owner', 'name email avatar');
    await updatedBoard.populate('members.user', 'name email avatar');

    res.json(updatedBoard);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete board
// @route   DELETE /api/boards/:id
// @access  Private
export const deleteBoard = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    // Only owner can delete
    if (board.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only owner can delete this board' });
    }

    const listIds = await List.find({ board: board._id }).distinct('_id');
    await Card.deleteMany({ list: { $in: listIds } });
    await List.deleteMany({ board: board._id });

    await board.deleteOne();

    res.json({ message: 'Board deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add member to board
// @route   POST /api/boards/:id/members
// @access  Private
export const addMember = async (req, res) => {
  try {
    const { email, role } = req.body;

    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    // Check if user is owner or admin
    const isOwner = board.owner.toString() === req.user._id.toString();
    const isAdmin = board.members.some(
      member => member.user.toString() === req.user._id.toString() && member.role === 'admin'
    );

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to add members' });
    }

    // Find user by email
    const User = (await import('../models/User.js')).default;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already a member
    const alreadyMember = board.members.some(
      member => member.user.toString() === user._id.toString()
    );

    if (alreadyMember) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    board.members.push({ user: user._id, role: role || 'member' });
    await board.save();

    await board.populate('members.user', 'name email avatar');

    res.json(board);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove member from board
// @route   DELETE /api/boards/:id/members/:userId
// @access  Private
export const removeMember = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    // Check if user is owner or admin
    const isOwner = board.owner.toString() === req.user._id.toString();
    const isAdmin = board.members.some(
      member => member.user.toString() === req.user._id.toString() && member.role === 'admin'
    );

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to remove members' });
    }

    if (board.owner.toString() === req.params.userId) {
      return res.status(400).json({ message: 'Cannot remove board owner' });
    }

    board.members = board.members.filter(
      member => member.user.toString() !== req.params.userId
    );
    await board.save();

    await board.populate('members.user', 'name email avatar');

    res.json(board);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};
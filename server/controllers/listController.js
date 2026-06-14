import List from '../models/List.js';
import Board from '../models/Board.js';

// @desc    Create new list
// @route   POST /api/lists
// @access  Private
export const createList = async (req, res) => {
  try {
    const { name, boardId, position } = req.body;

    const board = await Board.findById(boardId);

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    // Check if user is owner or member
    const isOwner = board.owner.toString() === req.user._id.toString();
    const isMember = board.members.some(
      member => member.user.toString() === req.user._id.toString()
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'Not authorized to create lists' });
    }

    // Get the last list position
    const lastList = await List.findOne({ board: boardId }).sort({ position: -1 });
    const newPosition = position || (lastList ? lastList.position + 1 : 0);

    const list = await List.create({
      name,
      board: boardId,
      position: newPosition,
      cards: []
    });

    // Add list to board
    board.lists.push(list._id);
    await board.save();

    res.status(201).json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update list
// @route   PUT /api/lists/:id
// @access  Private
export const updateList = async (req, res) => {
  try {
    const { name, position } = req.body;

    const list = await List.findById(req.params.id).populate('board');

    if (!list) {
      return res.status(404).json({ message: 'List not found' });
    }

    // Check if user is owner or member of the board
    const isOwner = list.board.owner.toString() === req.user._id.toString();
    const isMember = list.board.members.some(
      member => member.user.toString() === req.user._id.toString()
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'Not authorized to update this list' });
    }

    list.name = name || list.name;
    if (position !== undefined) {
      list.position = position;
    }

    const updatedList = await list.save();
    res.json(updatedList);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete list
// @route   DELETE /api/lists/:id
// @access  Private
export const deleteList = async (req, res) => {
  try {
    const list = await List.findById(req.params.id).populate('board');

    if (!list) {
      return res.status(404).json({ message: 'List not found' });
    }

    // Check if user is owner or member
    const isOwner = list.board.owner.toString() === req.user._id.toString();
    const isMember = list.board.members.some(
      member => member.user.toString() === req.user._id.toString()
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'Not authorized to delete this list' });
    }

    // Remove list from board
    const board = await Board.findById(list.board._id);
    board.lists = board.lists.filter(listId => listId.toString() !== list._id.toString());
    await board.save();

    // Delete all cards in the list
    const { default: Card } = await import('../models/Card.js');
    await Card.deleteMany({ list: list._id });

    await list.deleteOne();

    res.json({ message: 'List deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reorder lists
// @route   PUT /api/lists/reorder
// @access  Private
export const reorderLists = async (req, res) => {
  try {
    const { boardId, listIds } = req.body;

    const board = await Board.findById(boardId);

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    // Check if user is owner or member
    const isOwner = board.owner.toString() === req.user._id.toString();
    const isMember = board.members.some(
      member => member.user.toString() === req.user._id.toString()
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'Not authorized to reorder lists' });
    }

    // Update positions
    for (let i = 0; i < listIds.length; i++) {
      await List.findByIdAndUpdate(listIds[i], { position: i });
    }

    const lists = await List.find({ board: boardId }).sort({ position: 1 });

    res.json(lists);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};
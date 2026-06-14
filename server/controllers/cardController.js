import Card from '../models/Card.js';
import List from '../models/List.js';
import Board from '../models/Board.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { getIO } from '../socket.js';
import { escapeRegex } from '../utils/escapeRegex.js';

const toDateStart = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  dt.setHours(0, 0, 0, 0);
  return dt;
};

const toDateEnd = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  dt.setHours(23, 59, 59, 999);
  return dt;
};

// @desc    Search/filter cards
// @route   GET /api/cards
// @access  Private
export const getCards = async (req, res) => {
  try {
    const {
      boardId,
      search,
      status,
      priority,
      assignedTo,
      dueDate,
      page = 1,
      limit = 10,
      sort
    } = req.query;

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const skip = (parsedPage - 1) * parsedLimit;

    const memberOrOwnerProjectIds = await Board.find({
      $or: [{ owner: req.user._id }, { 'members.user': req.user._id }],
      ...(boardId ? { _id: boardId } : {}),
      isArchived: { $ne: true }
    }).select('_id');

    const projectIds = memberOrOwnerProjectIds.map((p) => p._id);

    if (!projectIds.length) {
      return res.json({ data: [], page: parsedPage, totalPages: 1, totalItems: 0 });
    }

    // Lists within those projects
    const lists = await List.find({
      board: { $in: projectIds }
    }).select('_id');

    const listIds = lists.map((l) => l._id);
    if (!listIds.length) {
      return res.json({ data: [], page: parsedPage, totalPages: 1, totalItems: 0 });
    }

    const query = {
      list: { $in: listIds }
    };

    if (search && typeof search === 'string' && search.trim()) {
      const term = escapeRegex(search.trim());
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: { $regex: term, $options: 'i' } },
          { description: { $regex: term, $options: 'i' } }
        ]
      });
    }

    // status mapping: UI expects Todo/In Progress/Review/Completed
    if (status) {
      const s = String(status).toLowerCase();
      const map = {
        todo: 'todo',
        'in progress': 'in-progress',
        inprogress: 'in-progress',
        review: 'review',
        completed: 'done',
        done: 'done'
      };
      query.status = map[s] || s;
    }

    if (priority) {
      const p = String(priority).toLowerCase();
      const map = {
        low: 'low',
        medium: 'medium',
        high: 'high',
        urgent: 'urgent'
      };
      query.priority = map[p] || p;
    }

    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    if (dueDate) {
      const start = toDateStart(dueDate);
      const end = toDateEnd(dueDate);
      if (start && end) {
        query.dueDate = { $gte: start, $lte: end };
      }
    }

    const normalizeSort = (rawSort) => {
      const s = String(rawSort || 'newest').trim().toLowerCase();

      // Canonical values (used by switch below): newest | oldest | priority | alphabetical | dueDate
      if (s === 'duedate' || s === 'due_date') return 'dueDate';
      if (s === 'newest' || s === 'oldest' || s === 'priority' || s === 'alphabetical') return s;


      // Fallback (should be prevented by validator)
      return 'newest';
    };


    const sortOption = (() => {
      const canonical = normalizeSort(sort);
      switch (canonical) {
        case 'oldest':
          return { createdAt: 1 };
        case 'alphabetical':
          return { title: 1 };
        case 'priority':
          // Map priority order via $switch is more complex; approximate by createdAt+priority not needed.
          // Keep stable ordering by createdAt when using priority sort.
          return { priority: 1, createdAt: -1 };
        case 'dueDate':
          return { dueDate: 1, createdAt: -1 };
        case 'newest':
        default:
          return { createdAt: -1 };
      }
    })();


    const totalItems = await Card.countDocuments(query);
    const totalPages = Math.max(Math.ceil(totalItems / parsedLimit) || 1, 1);

    const cards = await Card.find(query)
      .populate({
        path: 'list',
        populate: {
          path: 'board',
          select: 'owner members name'
        }
      })
      .populate('assignedTo', 'name email avatar')
      .populate('comments.user', 'name email avatar')
      .sort(sortOption)
      .skip(skip)
      .limit(parsedLimit);

    res.json({ data: cards, page: parsedPage, totalPages, totalItems });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new card
// @route   POST /api/cards
// @access  Private
export const createCard = async (req, res) => {
  try {
    const { title, description, listId, priority, labels, dueDate, position } = req.body;

    const list = await List.findById(listId).populate('board');

    if (!list) {
      return res.status(404).json({ message: 'List not found' });
    }

    // Check if user is owner or member
    const isOwner = list.board.owner.toString() === req.user._id.toString();
    const isMember = list.board.members.some(
      member => member.user.toString() === req.user._id.toString()
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'Not authorized to create cards' });
    }

    // Get the last card position
    const lastCard = await Card.findOne({ list: listId }).sort({ position: -1 });
    const newPosition = position || (lastCard ? lastCard.position + 1 : 0);

    const card = await Card.create({
      title,
      description,
      list: listId,
      priority,
      labels,
      dueDate,
      position: newPosition
    });

    // Add card to list
    list.cards.push(card._id);
    await list.save();

    await card.populate('assignedTo', 'name email avatar');

    // Emit realtime event to board room
    try {
      const io = getIO();
      if (io && list.board && list.board._id) {
        io.to(list.board._id.toString()).emit('cardCreated', card);
      }
    } catch (e) {
      console.error('Socket emit error (createCard):', e.message);
    }

    res.status(201).json(card);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single card
// @route   GET /api/cards/:id
// @access  Private
export const getCard = async (req, res) => {
  try {
    const card = await Card.findById(req.params.id)
      .populate('list')
      .populate({
        path: 'list',
        populate: {
          path: 'board',
          populate: [
            { path: 'owner', select: 'name email avatar' },
            { path: 'members.user', select: 'name email avatar' }
          ]
        }
      })
      .populate('assignedTo', 'name email avatar')
      .populate('comments.user', 'name email avatar');

    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    // Check if user is owner or member of the board
    const board = card.list.board;
    const isOwner = board.owner._id.toString() === req.user._id.toString();
    const isMember = board.members.some(
      member => member.user._id.toString() === req.user._id.toString()
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'Not authorized to view this card' });
    }

    res.json(card);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update card
// @route   PUT /api/cards/:id
// @access  Private
export const updateCard = async (req, res) => {
  try {
    const {
      title,
      description,
      priority,
      labels,
      dueDate,
      position,
      checklist
    } = req.body;

    const card = await Card.findById(req.params.id)
      .populate({
        path: 'list',
        populate: { path: 'board' }
      });

    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    // Check if user is owner or member
    const isOwner = card.list.board.owner.toString() === req.user._id.toString();
    const isMember = card.list.board.members.some(
      member => member.user.toString() === req.user._id.toString()
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'Not authorized to update this card' });
    }

    card.title = title || card.title;
    card.description = description || card.description;
    card.priority = priority || card.priority;
    card.labels = labels || card.labels;
    card.dueDate = dueDate !== undefined ? dueDate : card.dueDate;
    if (position !== undefined) card.position = position;
    if (checklist) card.checklist = checklist;

    const updatedCard = await card.save();
    await updatedCard.populate('assignedTo', 'name email avatar');
    await updatedCard.populate('comments.user', 'name email avatar');

    // Create notifications for assigned users and board members (excluding actor)
    try {
      const recipients = new Set();
      (updatedCard.assignedTo || []).forEach(u => recipients.add(u.toString()));
      if (card.list && card.list.board) {
        recipients.add(card.list.board.owner.toString());
        (card.list.board.members || []).forEach(m => recipients.add(m.user.toString()));
      }
      recipients.delete(req.user._id.toString());

      for (const userId of recipients) {
        const n = await Notification.create({
          user: userId,
          actor: req.user._id,
          type: 'task_updated',
          message: `${req.user.name} updated a task`,
          referenceId: updatedCard._id
        });
        try {
          const io = getIO();
          if (io) io.to(`user:${userId}`).emit('notification', n);
        } catch (e) {
          console.error('Notification emit error', e.message);
        }
      }

    } catch (e) {
      console.error('Notification creation failed', e.message);
    }

    // Emit realtime update
    try {
      const io = getIO();
      if (io && card.list && card.list.board && card.list.board._id) {
        io.to(card.list.board._id.toString()).emit('cardUpdated', updatedCard);
      }
    } catch (e) {
      console.error('Socket emit error (updateCard):', e.message);
    }

    res.json(updatedCard);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete card
// @route   DELETE /api/cards/:id
// @access  Private
export const deleteCard = async (req, res) => {
  try {
    const card = await Card.findById(req.params.id)
      .populate({
        path: 'list',
        populate: { path: 'board' }
      });

    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    // Check if user is owner or member
    const isOwner = card.list.board.owner.toString() === req.user._id.toString();
    const isMember = card.list.board.members.some(
      member => member.user.toString() === req.user._id.toString()
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'Not authorized to delete this card' });
    }

    // Remove card from list
    const list = await List.findById(card.list._id);
    list.cards = list.cards.filter(cardId => cardId.toString() !== card._id.toString());
    await list.save();

    await card.deleteOne();

    // Emit realtime deletion
    try {
      const io = getIO();
      if (io && card.list && card.list.board && card.list.board._id) {
        io.to(card.list.board._id.toString()).emit('cardDeleted', { cardId: card._id, listId: card.list._id });
      }
    } catch (e) {
      console.error('Socket emit error (deleteCard):', e.message);
    }

    res.json({ message: 'Card deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Move card to another list
// @route   PUT /api/cards/:id/move
// @access  Private
export const moveCard = async (req, res) => {
  try {
    const { listId, position } = req.body;

    const card = await Card.findById(req.params.id)
      .populate({
        path: 'list',
        populate: { path: 'board' }
      });

    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    // Check if user is owner or member
    const isOwner = card.list.board.owner.toString() === req.user._id.toString();
    const isMember = card.list.board.members.some(
      member => member.user.toString() === req.user._id.toString()
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'Not authorized to move this card' });
    }

    const boardId = card.list.board._id.toString();
    const oldList = await List.findById(card.list._id);
    const newList = await List.findById(listId);

    if (!newList) {
      return res.status(404).json({ message: 'Target list not found' });
    }

    if (newList.board.toString() !== boardId) {
      return res.status(400).json({ message: 'Target list must belong to the same board' });
    }

    // Remove from old list
    oldList.cards = oldList.cards.filter(cardId => cardId.toString() !== card._id.toString());
    await oldList.save();

    // Add to new list and infer status from column name
    card.list = listId;
    card.position = position ?? newList.cards.length;
    const listName = (newList.name || '').toLowerCase();
    if (listName.includes('done') || listName.includes('complete')) {
      card.status = 'done';
    } else if (listName.includes('review')) {
      card.status = 'review';
    } else if (listName.includes('progress')) {
      card.status = 'in-progress';
    } else {
      card.status = 'todo';
    }
    await card.save();

    newList.cards.push(card._id);
    await newList.save();

    await card.populate('assignedTo', 'name email avatar');

    // Emit realtime move
    try {
      const io = getIO();
      if (io && boardId) {
        io.to(boardId).emit('cardMoved', {
          card,
          fromList: oldList._id,
          toList: newList._id,
          position: card.position
        });
      }
    } catch (e) {
      console.error('Socket emit error (moveCard):', e.message);
    }

    res.json(card);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add comment to card
// @route   POST /api/cards/:id/comments
// @access  Private
export const addComment = async (req, res) => {
  try {
    const { text } = req.body;

    const card = await Card.findById(req.params.id)
      .populate({
        path: 'list',
        populate: { path: 'board' }
      });

    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    // Check if user is owner or member
    const isOwner = card.list.board.owner.toString() === req.user._id.toString();
    const isMember = card.list.board.members.some(
      member => member.user.toString() === req.user._id.toString()
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'Not authorized to comment on this card' });
    }

    card.comments.push({
      user: req.user._id,
      text,
      createdAt: new Date()
    });

    await card.save();
    await card.populate('comments.user', 'name email avatar');

    // Emit comment added
    try {
      const io = getIO();
      if (io && card.list && card.list.board && card.list.board._id) {
        io.to(card.list.board._id.toString()).emit('cardUpdated', card);
      }
    } catch (e) {
      console.error('Socket emit error (addComment):', e.message);
    }

    res.json(card.comments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Assign user to card
// @route   PUT /api/cards/:id/assign
// @access  Private
export const assignUser = async (req, res) => {
  try {
    const { userId } = req.body;

    const card = await Card.findById(req.params.id)
      .populate({
        path: 'list',
        populate: { path: 'board' }
      });

    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    // Check if user is owner or member
    const isOwner = card.list.board.owner.toString() === req.user._id.toString();
    const isMember = card.list.board.members.some(
      member => member.user.toString() === req.user._id.toString()
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'Not authorized to assign users' });
    }

    const assignee = await User.findById(userId);
    if (!assignee) {
      return res.status(404).json({ message: 'User not found' });
    }

    const board = card.list.board;
    const isAssigneeMember =
      board.owner.toString() === userId ||
      board.members.some((m) => m.user.toString() === userId);

    if (!isAssigneeMember) {
      return res.status(400).json({ message: 'User must be a board member to be assigned' });
    }

    const alreadyAssigned = card.assignedTo.some(
      user => user.toString() === userId
    );

    if (alreadyAssigned) {
      return res.status(400).json({ message: 'User already assigned' });
    }

    card.assignedTo.push(userId);
    await card.save();

    await card.populate('assignedTo', 'name email avatar');

    // Create notification for assigned user
    try {
      const n = await Notification.create({
        user: userId,
        actor: req.user._id,
        type: 'task_assigned',
        message: `${req.user.name} assigned you to a task`,
        referenceId: card._id
      });
      try {
        const io = getIO();
        if (io) io.to(`user:${userId.toString()}`).emit('notification', n);
      } catch (e) {
        console.error('Notification emit error', e.message);
      }
    } catch (e) {
      console.error('Notification creation failed', e.message);
    }

    // Emit assignment update
    try {
      const io = getIO();
      if (io && card.list && card.list.board && card.list.board._id) {
        io.to(card.list.board._id.toString()).emit('cardUpdated', card);
      }
    } catch (e) {
      console.error('Socket emit error (assignUser):', e.message);
    }

    res.json(card);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Unassign user from card
// @route   PUT /api/cards/:id/unassign
// @access  Private
export const unassignUser = async (req, res) => {
  try {
    const { userId } = req.body;

    const card = await Card.findById(req.params.id)
      .populate({
        path: 'list',
        populate: { path: 'board' }
      });

    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    // Check if user is owner or member
    const isOwner = card.list.board.owner.toString() === req.user._id.toString();
    const isMember = card.list.board.members.some(
      member => member.user.toString() === req.user._id.toString()
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'Not authorized to unassign users' });
    }

    card.assignedTo = card.assignedTo.filter(
      user => user.toString() !== userId
    );
    await card.save();

    await card.populate('assignedTo', 'name email avatar');

    // Emit unassign update
    try {
      const io = getIO();
      if (io && card.list && card.list.board && card.list.board._id) {
        io.to(card.list.board._id.toString()).emit('cardUpdated', card);
      }
    } catch (e) {
      console.error('Socket emit error (unassignUser):', e.message);
    }

    res.json(card);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};
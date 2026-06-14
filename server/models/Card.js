import mongoose from 'mongoose';

const cardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a card title'],
    trim: true,
    maxlength: [200, 'Card title cannot be more than 200 characters'],
    index: true
  },
  description: {
    type: String,
    maxlength: [2000, 'Description cannot be more than 2000 characters'],
    default: ''
  },
  list: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'List',
    required: true,
    index: true
  },
  position: {
    type: Number,
    default: 0,
    index: true
  },
  dueDate: {
    type: Date,
    default: null,
    index: true // For sorting by due date
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  status: {
    type: String,
    enum: ['todo', 'in-progress', 'review', 'done'],
    default: 'todo',
    index: true
  },
  labels: [{
    type: String,
    enum: ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray'],
    default: [],
    index: true
  }],
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true // For filtering cards by assignee
  }],
  checklist: [{
    id: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId()
    },
    text: String,
    completed: {
      type: Boolean,
      default: false
    }
  }],
  attachments: [{
    name: String,
    url: String,
    type: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    text: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for common query patterns
// Cards by list with position (for ordering)
cardSchema.index({ list: 1, position: 1 });

// Cards by status with archive filter
cardSchema.index({ status: 1, isArchived: 1 });

// Cards by assignee
cardSchema.index({ assignedTo: 1, isArchived: 1 });

// Cards by priority (for sorting)
cardSchema.index({ priority: -1, createdAt: -1 });

// Cards by due date (for overdue queries)
cardSchema.index({ dueDate: 1, isArchived: 1 });

// Text search on title
cardSchema.index({ title: 'text' });

export default mongoose.model('Card', cardSchema);
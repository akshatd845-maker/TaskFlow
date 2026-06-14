import mongoose from 'mongoose';

const boardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a board name'],
    trim: true,
    maxlength: [100, 'Board name cannot be more than 100 characters'],
    index: true
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters'],
    default: ''
  },
  background: {
    type: String,
    default: '#6366f1'
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null,
    index: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    role: {
      type: String,
      enum: ['admin', 'member', 'viewer'],
      default: 'member'
    }
  }],
  lists: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'List'
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
boardSchema.index({ owner: 1, isArchived: 1 });
boardSchema.index({ project: 1, isArchived: 1 });
boardSchema.index({ 'members.user': 1, isArchived: 1 });

// Text search on name and description
boardSchema.index({ name: 'text', description: 'text' });

export default mongoose.model('Board', boardSchema);
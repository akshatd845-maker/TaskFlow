import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Project title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters'],
    index: true // Index for search
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Project owner is required'],
    index: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    role: {
      type: String,
      enum: ['admin', 'member', 'viewer'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['active', 'archived', 'completed', 'on-hold'],
    default: 'active',
    index: true
  },
  color: {
    type: String,
    default: '#3b82f6'
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for common query patterns
// Projects by owner with active status (common filter)
projectSchema.index({ owner: 1, isArchived: 1 });

// Projects by member with active status
projectSchema.index({ 'members.user': 1, isArchived: 1 });

// Full-text search index on title and description
projectSchema.index({ title: 'text', description: 'text' });

// Prevent duplicate titles for same owner
projectSchema.index({ owner: 1, title: 1 }, { unique: true });

export default mongoose.model('Project', projectSchema);
import mongoose from 'mongoose';

const listSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a list name'],
    trim: true,
    maxlength: [100, 'List name cannot be more than 100 characters'],
    index: true
  },
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: true,
    index: true
  },
  cards: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Card'
  }],
  position: {
    type: Number,
    default: 0,
    index: true
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes
listSchema.index({ board: 1, position: 1 });
listSchema.index({ board: 1, isArchived: 1 });

export default mongoose.model('List', listSchema);
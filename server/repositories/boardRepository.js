import Board from '../models/Board.js';

class BoardRepository {
  async findById(id) {
    return Board.findById(id);
  }

  async findOne(query = {}) {
    return Board.findOne(query);
  }

  async find(query = {}, sort = { updatedAt: -1 }) {
    return Board.find(query)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .sort(sort);
  }

  async create(boardData) {
    return Board.create(boardData);
  }

  async update(id, updateData, options = { new: true, runValidators: true }) {
    return Board.findByIdAndUpdate(id, updateData, options);
  }

  async delete(id) {
    return Board.findByIdAndDelete(id);
  }
}

export default new BoardRepository();

import Card from '../models/Card.js';

class CardRepository {
  async findById(id) {
    return Card.findById(id);
  }

  async findOne(query = {}) {
    return Card.findOne(query);
  }

  async find(query = {}, sort = { createdAt: -1 }, skip = 0, limit = 10) {
    return Card.find(query)
      .populate('assignedTo', 'name email avatar')
      .populate('comments.user', 'name email avatar')
      .sort(sort)
      .skip(skip)
      .limit(limit);
  }

  async count(query = {}) {
    return Card.countDocuments(query);
  }

  async create(cardData) {
    return Card.create(cardData);
  }

  async update(id, updateData, options = { new: true, runValidators: true }) {
    return Card.findByIdAndUpdate(id, updateData, options);
  }

  async delete(id) {
    return Card.findByIdAndDelete(id);
  }

  async deleteMany(query = {}) {
    return Card.deleteMany(query);
  }
}

export default new CardRepository();

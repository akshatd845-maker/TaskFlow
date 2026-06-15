import User from '../models/User.js';

class UserRepository {
  async findById(id, selectFields = '') {
    const query = User.findById(id);
    if (selectFields) {
      query.select(selectFields);
    }
    return query;
  }

  async findByEmail(email, selectFields = '') {
    const query = User.findOne({ email });
    if (selectFields) {
      query.select(selectFields);
    }
    return query;
  }

  async create(userData) {
    return User.create(userData);
  }

  async update(id, updateData, options = { new: true, runValidators: true }) {
    return User.findByIdAndUpdate(id, updateData, options);
  }

  async delete(id) {
    return User.findByIdAndDelete(id);
  }

  async find(query = {}) {
    return User.find(query);
  }
}

export default new UserRepository();

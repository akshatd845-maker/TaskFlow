import List from '../models/List.js';

class ListRepository {
  async findById(id) {
    return List.findById(id);
  }

  async findOne(query = {}) {
    return List.findOne(query);
  }

  async find(query = {}, sort = { position: 1 }) {
    return List.find(query).sort(sort);
  }

  async create(listData) {
    return List.create(listData);
  }

  async update(id, updateData, options = { new: true, runValidators: true }) {
    return List.findByIdAndUpdate(id, updateData, options);
  }

  async delete(id) {
    return List.findByIdAndDelete(id);
  }

  async deleteMany(query = {}) {
    return List.deleteMany(query);
  }
}

export default new ListRepository();

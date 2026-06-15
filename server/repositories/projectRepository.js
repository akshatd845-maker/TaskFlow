import Project from '../models/Project.js';

class ProjectRepository {
  async findById(id) {
    return Project.findById(id);
  }

  async find(query = {}, sort = { createdAt: -1 }, skip = 0, limit = 10) {
    return Project.find(query)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .sort(sort)
      .skip(skip)
      .limit(limit);
  }

  async count(query = {}) {
    return Project.countDocuments(query);
  }

  async create(projectData) {
    return Project.create(projectData);
  }

  async update(id, updateData, options = { new: true, runValidators: true }) {
    return Project.findByIdAndUpdate(id, updateData, options);
  }

  async delete(id) {
    return Project.findByIdAndDelete(id);
  }

  async findRaw(query = {}) {
    return Project.find(query);
  }
}

export default new ProjectRepository();

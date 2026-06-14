import { projectAPI } from './api';

const unwrapList = (response) => {
  const body = response.data;
  if (body && Array.isArray(body.data)) {
    return body.data;
  }
  return Array.isArray(body) ? body : [];
};

export const projectService = {
  getAll: async (params) => {
    const response = await projectAPI.getAll(params);
    return unwrapList(response);
  },

  getOne: async (id) => {
    const response = await projectAPI.getOne(id);
    return response.data;
  },

  create: async (data) => {
    const response = await projectAPI.create(data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await projectAPI.update(id, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await projectAPI.delete(id);
    return response.data;
  },

  getTeam: async (projectId, params) => {
    const response = await projectAPI.getTeam(projectId, params);
    return unwrapList(response);
  },

  getBoardId: async (projectId) => {
    const response = await projectAPI.getBoard(projectId);
    return response.data.boardId;
  },

  inviteMember: async (projectId, data) => {
    const { email, role } = data || {};
    const response = await projectAPI.addMember(projectId, email, role);
    return response.data;
  },

  updateRole: async (projectId, userId, role) => {
    const response = await projectAPI.updateMemberRole(projectId, userId, role);
    return response.data;
  },

  removeMember: async (projectId, userId) => {
    const response = await projectAPI.removeMember(projectId, userId);
    return response.data;
  }
};

export default projectService;

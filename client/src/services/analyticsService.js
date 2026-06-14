import { api } from './api';

// Note: we reuse the same axios instance that already attaches auth token.
export const analyticsService = {
  getOverview: () => api.get('/analytics/overview'),
  getProjectProgress: () => api.get('/analytics/project-progress'),
  getTeamProductivity: () => api.get('/analytics/team-productivity'),
  getTaskStatus: () => api.get('/analytics/task-status')
};

export default analyticsService;


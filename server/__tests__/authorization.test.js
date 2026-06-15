import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { AuthResult, authorizeProjectAccess, authorizeBoardAccess } from '../utils/authorization.js';
import Project from '../models/Project.js';
import Board from '../models/Board.js';

// Overwrite model methods directly for testing
const mockFindById = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('Cast Error');
    err.name = 'CastError';
    return Promise.reject(err);
  }
  return Promise.resolve(null);
};

Project.findById = jest.fn().mockImplementation(mockFindById);
Board.findById = jest.fn().mockImplementation(mockFindById);

describe('authorization utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Project.findById.mockImplementation(mockFindById);
    Board.findById.mockImplementation(mockFindById);
  });

  describe('AuthResult', () => {
    it('should create allowed result', () => {
      const result = AuthResult.allowed('owner');
      expect(result.authorized).toBe(true);
      expect(result.userRole).toBe('owner');
    });

    it('should create denied result', () => {
      const result = AuthResult.denied('Not authorized');
      expect(result.authorized).toBe(false);
      expect(result.message).toBe('Not authorized');
    });
  });

  describe('authorizeProjectAccess', () => {
    it('should return denied for non-existent project', async () => {
      Project.findById.mockResolvedValue(null);

      const result = await authorizeProjectAccess('invalid123', 'user1');
      expect(result.authorized).toBe(false);
      expect(result.message).toBe('Project not found');
    });

    it('should return denied for invalid project ID', async () => {
      const result = await authorizeProjectAccess('not-an-object-id', 'user1');
      expect(result.authorized).toBe(false);
      expect(result.message).toBe('Invalid project ID');
    });

    it('should return owner role for project owner', async () => {
      const mockProject = {
        _id: 'proj1',
        owner: { _id: 'user1' },
        members: []
      };
      Project.findById.mockResolvedValue(mockProject);

      const result = await authorizeProjectAccess('proj1', 'user1');
      expect(result.authorized).toBe(true);
      expect(result.userRole).toBe('owner');
    });

    it('should return member role for project member', async () => {
      const mockProject = {
        _id: 'proj1',
        owner: { _id: 'owner1' },
        members: [{ user: { _id: 'user2' }, role: 'member' }]
      };
      Project.findById.mockResolvedValue(mockProject);

      const result = await authorizeProjectAccess('proj1', 'user2');
      expect(result.authorized).toBe(true);
      expect(result.userRole).toBe('member');
    });

    it('should return denied for non-member', async () => {
      const mockProject = {
        _id: 'proj1',
        owner: { _id: 'user1' },
        members: []
      };
      Project.findById.mockResolvedValue(mockProject);

      const result = await authorizeProjectAccess('proj1', 'user3');
      expect(result.authorized).toBe(false);
      expect(result.message).toBe('Not authorized to access this project');
    });
  });

  describe('authorizeBoardAccess', () => {
    it('should return denied for non-existent board', async () => {
      Board.findById.mockResolvedValue(null);

      const result = await authorizeBoardAccess('invalid123', 'user1');
      expect(result.authorized).toBe(false);
    });

    it('should return owner role for board owner', async () => {
      const mockBoard = {
        _id: 'board1',
        owner: { _id: 'user1' },
        members: []
      };
      Board.findById.mockResolvedValue(mockBoard);

      const result = await authorizeBoardAccess('board1', 'user1');
      expect(result.authorized).toBe(true);
      expect(result.userRole).toBe('owner');
    });
  });
});
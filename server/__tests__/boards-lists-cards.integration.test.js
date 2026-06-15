/**
 * Boards, Lists, and Cards Integration Tests
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../server.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Board from '../models/Board.js';
import List from '../models/List.js';
import Card from '../models/Card.js';
import connectDB, { disconnectDB } from '../config/db.js';

const generateTestToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

describe('Boards, Lists, and Cards Integration Tests', () => {
  let testUser;
  let testToken;
  let testProject;
  let testBoard;
  let testList;
  let testCard;

  beforeAll(async () => {
    process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskflow_test';
    await connectDB();
  });

  afterAll(async () => {
    // Cleanup
    if (testUser) {
      await User.findByIdAndDelete(testUser._id);
    }
    await disconnectDB();
  });

  beforeEach(async () => {
    // Clean up
    await User.deleteMany({ email: { $regex: /blctest.*@example\.com$/ } });
    await Card.deleteMany({ title: { $regex: /^Test Card/ } });
    await List.deleteMany({ name: { $regex: /^Test List/ } });
    await Board.deleteMany({ name: { $regex: /^Test Board/ } });
    await Project.deleteMany({ name: { $regex: /^Test Project/ } });

    testUser = await User.create({
      name: 'BLC Test User',
      email: 'blctest@example.com',
      password: 'TestPassword123!'
    });
    testToken = generateTestToken(testUser);

    testProject = await Project.create({
      name: 'Test Project BLC',
      owner: testUser._id,
      members: [{ user: testUser._id, role: 'OWNER' }]
    });
  });

  // ==================== BOARDS ====================
  describe('POST /api/boards', () => {
    it('should create a new board', async () => {
      const res = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          projectId: testProject._id.toString(),
          name: 'Test Board One'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('name', 'Test Board One');
      testBoard = res.body.data;
    });

    it('should reject board without projectId', async () => {
      const res = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          name: 'Test Board'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/boards/:id', () => {
    beforeEach(async () => {
      testBoard = await Board.create({
        name: 'Test Board GET',
        project: testProject._id,
        owner: testUser._id
      });
    });

    it('should get board by ID', async () => {
      const res = await request(app)
        .get(`/api/boards/${testBoard._id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('name', 'Test Board GET');
    });
  });

  describe('PUT /api/boards/:id', () => {
    beforeEach(async () => {
      testBoard = await Board.create({
        name: 'Test Board Update',
        project: testProject._id,
        owner: testUser._id
      });
    });

    it('should update board', async () => {
      const res = await request(app)
        .put(`/api/boards/${testBoard._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          name: 'Updated Board Name'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('name', 'Updated Board Name');
    });
  });

  describe('DELETE /api/boards/:id', () => {
    beforeEach(async () => {
      testBoard = await Board.create({
        name: 'Test Board Delete',
        project: testProject._id,
        owner: testUser._id
      });
    });

    it('should delete board', async () => {
      const res = await request(app)
        .delete(`/api/boards/${testBoard._id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==================== LISTS ====================
  describe('POST /api/lists', () => {
    beforeEach(async () => {
      testBoard = await Board.create({
        name: 'Test Board Lists',
        project: testProject._id,
        owner: testUser._id
      });
    });

    it('should create a new list', async () => {
      const res = await request(app)
        .post('/api/lists')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          boardId: testBoard._id.toString(),
          name: 'Test List One'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('name', 'Test List One');
      testList = res.body.data;
    });
  });

  describe('GET /api/lists/:id', () => {
    beforeEach(async () => {
      testBoard = await Board.create({
        name: 'Test Board Lists GET',
        project: testProject._id,
        owner: testUser._id
      });
      testList = await List.create({
        name: 'Test List GET',
        board: testBoard._id,
        position: 0
      });
    });

    it('should get list by ID', async () => {
      const res = await request(app)
        .get(`/api/lists/${testList._id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('PUT /api/lists/:id', () => {
    beforeEach(async () => {
      testBoard = await Board.create({
        name: 'Test Board Lists Update',
        project: testProject._id,
        owner: testUser._id
      });
      testList = await List.create({
        name: 'Test List Update',
        board: testBoard._id,
        position: 0
      });
    });

    it('should update list', async () => {
      const res = await request(app)
        .put(`/api/lists/${testList._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          name: 'Updated List Name'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('DELETE /api/lists/:id', () => {
    beforeEach(async () => {
      testBoard = await Board.create({
        name: 'Test Board Lists Delete',
        project: testProject._id,
        owner: testUser._id
      });
      testList = await List.create({
        name: 'Test List Delete',
        board: testBoard._id,
        position: 0
      });
    });

    it('should delete list', async () => {
      const res = await request(app)
        .delete(`/api/lists/${testList._id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('PATCH /api/lists/:id/reorder', () => {
    beforeEach(async () => {
      testBoard = await Board.create({
        name: 'Test Board Lists Reorder',
        project: testProject._id,
        owner: testUser._id
      });
      testList = await List.create({
        name: 'Test List Reorder',
        board: testBoard._id,
        position: 0
      });
    });

    it('should reorder list', async () => {
      const res = await request(app)
        .patch(`/api/lists/${testList._id}/reorder`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          position: 5
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==================== CARDS ====================
  describe('POST /api/cards', () => {
    beforeEach(async () => {
      testBoard = await Board.create({
        name: 'Test Board Cards',
        project: testProject._id,
        owner: testUser._id
      });
      testList = await List.create({
        name: 'Test List Cards',
        board: testBoard._id,
        position: 0
      });
    });

    it('should create a new card', async () => {
      const res = await request(app)
        .post('/api/cards')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          listId: testList._id.toString(),
          title: 'Test Card One',
          description: 'Test card description'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('title', 'Test Card One');
      testCard = res.body.data;
    });
  });

  describe('GET /api/cards/:id', () => {
    beforeEach(async () => {
      testBoard = await Board.create({
        name: 'Test Board Cards GET',
        project: testProject._id,
        owner: testUser._id
      });
      testList = await List.create({
        name: 'Test List Cards GET',
        board: testBoard._id,
        position: 0
      });
      testCard = await Card.create({
        title: 'Test Card GET',
        list: testList._id,
        position: 0
      });
    });

    it('should get card by ID', async () => {
      const res = await request(app)
        .get(`/api/cards/${testCard._id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('PUT /api/cards/:id', () => {
    beforeEach(async () => {
      testBoard = await Board.create({
        name: 'Test Board Cards Update',
        project: testProject._id,
        owner: testUser._id
      });
      testList = await List.create({
        name: 'Test List Cards Update',
        board: testBoard._id,
        position: 0
      });
      testCard = await Card.create({
        title: 'Test Card Update',
        list: testList._id,
        position: 0
      });
    });

    it('should update card', async () => {
      const res = await request(app)
        .put(`/api/cards/${testCard._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          title: 'Updated Card Title',
          priority: 'high'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('title', 'Updated Card Title');
    });
  });

  describe('DELETE /api/cards/:id', () => {
    beforeEach(async () => {
      testBoard = await Board.create({
        name: 'Test Board Cards Delete',
        project: testProject._id,
        owner: testUser._id
      });
      testList = await List.create({
        name: 'Test List Cards Delete',
        board: testBoard._id,
        position: 0
      });
      testCard = await Card.create({
        title: 'Test Card Delete',
        list: testList._id,
        position: 0
      });
    });

    it('should delete card', async () => {
      const res = await request(app)
        .delete(`/api/cards/${testCard._id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('PATCH /api/cards/:id/move', () => {
    let targetList;

    beforeEach(async () => {
      testBoard = await Board.create({
        name: 'Test Board Cards Move',
        project: testProject._id,
        owner: testUser._id
      });
      testList = await List.create({
        name: 'Test List Source',
        board: testBoard._id,
        position: 0
      });
      targetList = await List.create({
        name: 'Test List Target',
        board: testBoard._id,
        position: 1
      });
      testCard = await Card.create({
        title: 'Test Card Move',
        list: testList._id,
        position: 0
      });
    });

    it('should move card between lists', async () => {
      const res = await request(app)
        .patch(`/api/cards/${testCard._id}/move`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          targetListId: targetList._id.toString(),
          position: 0
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('PATCH /api/cards/:id/assign', () => {
    beforeEach(async () => {
      testBoard = await Board.create({
        name: 'Test Board Cards Assign',
        project: testProject._id,
        owner: testUser._id
      });
      testList = await List.create({
        name: 'Test List Assign',
        board: testBoard._id,
        position: 0
      });
      testCard = await Card.create({
        title: 'Test Card Assign',
        list: testList._id,
        position: 0
      });
    });

    it('should assign user to card', async () => {
      const res = await request(app)
        .patch(`/api/cards/${testCard._id}/assign`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          userId: testUser._id.toString()
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('PATCH /api/cards/:id/priority', () => {
    beforeEach(async () => {
      testBoard = await Board.create({
        name: 'Test Board Cards Priority',
        project: testProject._id,
        owner: testUser._id
      });
      testList = await List.create({
        name: 'Test List Priority',
        board: testBoard._id,
        position: 0
      });
      testCard = await Card.create({
        title: 'Test Card Priority',
        list: testList._id,
        position: 0,
        priority: 'medium'
      });
    });

    it('should change card priority', async () => {
      const res = await request(app)
        .patch(`/api/cards/${testCard._id}/priority`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          priority: 'urgent'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.priority).toBe('urgent');
    });
  });

  describe('PATCH /api/cards/:id/due', () => {
    beforeEach(async () => {
      testBoard = await Board.create({
        name: 'Test Board Cards Due',
        project: testProject._id,
        owner: testUser._id
      });
      testList = await List.create({
        name: 'Test List Due',
        board: testBoard._id,
        position: 0
      });
      testCard = await Card.create({
        title: 'Test Card Due',
        list: testList._id,
        position: 0
      });
    });

    it('should update card due date', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .patch(`/api/cards/${testCard._id}/due`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          dueDate: futureDate
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
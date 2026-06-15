/**
 * Comments and Notifications Integration Tests
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../server.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Board from '../models/Board.js';
import List from '../models/List.js';
import Card from '../models/Card.js';
import Comment from '../models/Comment.js';
import Notification from '../models/Notification.js';
import connectDB, { disconnectDB } from '../config/db.js';

const generateTestToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

describe('Comments and Notifications Integration Tests', () => {
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
    if (testUser) {
      await User.findByIdAndDelete(testUser._id);
    }
    await disconnectDB();
  });

  beforeEach(async () => {
    // Clean up
    await Notification.deleteMany({ recipient: testUser?._id });
    await Comment.deleteMany({ content: { $regex: /^Test Comment/ } });
    await Card.deleteMany({ title: { $regex: /^Test Card/ } });
    await List.deleteMany({ name: { $regex: /^Test List/ } });
    await Board.deleteMany({ name: { $regex: /^Test Board/ } });
    await Project.deleteMany({ name: { $regex: /^Test Project/ } });
    await User.deleteMany({ email: { $regex: /cntest.*@example\.com$/ } });

    testUser = await User.create({
      name: 'CN Test User',
      email: 'cntest@example.com',
      password: 'TestPassword123!'
    });
    testToken = generateTestToken(testUser);

    testProject = await Project.create({
      name: 'Test Project CN',
      owner: testUser._id,
      members: [{ user: testUser._id, role: 'OWNER' }]
    });

    testBoard = await Board.create({
      name: 'Test Board CN',
      project: testProject._id,
      owner: testUser._id
    });

    testList = await List.create({
      name: 'Test List CN',
      board: testBoard._id,
      position: 0
    });

    testCard = await Card.create({
      title: 'Test Card CN',
      list: testList._id,
      position: 0
    });
  });

  // ==================== COMMENTS ====================
  describe('POST /api/comments', () => {
    it('should add a comment to a card', async () => {
      const res = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          cardId: testCard._id.toString(),
          content: 'Test Comment Content'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('content', 'Test Comment Content');
    });

    it('should reject comment without content', async () => {
      const res = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          cardId: testCard._id.toString()
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/comments/:cardId', () => {
    beforeEach(async () => {
      await Comment.create({
        card: testCard._id,
        author: testUser._id,
        content: 'Test Comment One'
      });
    });

    it('should get all comments for a card', async () => {
      const res = await request(app)
        .get(`/api/comments/${testCard._id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('PUT /api/comments/:id', () => {
    let testComment;

    beforeEach(async () => {
      testComment = await Comment.create({
        card: testCard._id,
        author: testUser._id,
        content: 'Original Comment'
      });
    });

    it('should edit a comment', async () => {
      const res = await request(app)
        .put(`/api/comments/${testComment._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          content: 'Updated Comment Content'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('content', 'Updated Comment Content');
    });
  });

  describe('DELETE /api/comments/:id', () => {
    let testComment;

    beforeEach(async () => {
      testComment = await Comment.create({
        card: testCard._id,
        author: testUser._id,
        content: 'Comment to Delete'
      });
    });

    it('should delete a comment', async () => {
      const res = await request(app)
        .delete(`/api/comments/${testComment._id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==================== NOTIFICATIONS ====================
  describe('GET /api/notifications', () => {
    beforeEach(async () => {
      await Notification.create({
        recipient: testUser._id,
        type: 'comment',
        message: 'Test Notification',
        isRead: false
      });
    });

    it('should get all notifications for user', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('PATCH /api/notifications/:id/read', () => {
    let testNotification;

    beforeEach(async () => {
      testNotification = await Notification.create({
        recipient: testUser._id,
        type: 'comment',
        message: 'Test Notification Read',
        isRead: false
      });
    });

    it('should mark notification as read', async () => {
      const res = await request(app)
        .patch(`/api/notifications/${testNotification._id}/read`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isRead).toBe(true);
    });
  });

  describe('POST /api/notifications/read-all', () => {
    beforeEach(async () => {
      await Notification.create([
        {
          recipient: testUser._id,
          type: 'comment',
          message: 'Test Notification 1',
          isRead: false
        },
        {
          recipient: testUser._id,
          type: 'mention',
          message: 'Test Notification 2',
          isRead: false
        }
      ]);
    });

    it('should mark all notifications as read', async () => {
      const res = await request(app)
        .post('/api/notifications/read-all')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    let testNotification;

    beforeEach(async () => {
      testNotification = await Notification.create({
        recipient: testUser._id,
        type: 'comment',
        message: 'Test Notification Delete',
        isRead: false
      });
    });

    it('should delete a notification', async () => {
      const res = await request(app)
        .delete(`/api/notifications/${testNotification._id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
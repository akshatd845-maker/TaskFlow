/**
 * Projects Integration Tests
 * Tests for project endpoints
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../server.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import connectDB, { disconnectDB } from '../config/db.js';

const generateTestToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

describe('Projects Integration Tests', () => {
  let testUser;
  let testToken;
  let testProject;

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
    await User.deleteMany({ email: { $regex: /test.*@example\.com$/ } });
    await Project.deleteMany({ name: { $regex: /^Test Project/ } });
    testUser = null;
    testToken = null;
    testProject = null;
  });

  describe('POST /api/projects', () => {
    beforeEach(async () => {
      testUser = await User.create({
        name: 'Project Test User',
        email: 'projecttest@example.com',
        password: 'TestPassword123!'
      });
      testToken = generateTestToken(testUser);
    });

    it('should create a new project successfully', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          name: 'Test Project One',
          description: 'Test project description',
          color: '#4f46e5'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('name', 'Test Project One');
      testProject = res.body.data;
    });

    it('should reject project without name', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          description: 'Test project description'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/projects', () => {
    beforeEach(async () => {
      testUser = await User.create({
        name: 'Project Test User',
        email: 'projecttest2@example.com',
        password: 'TestPassword123!'
      });
      testToken = generateTestToken(testUser);

      // Create a test project
      testProject = await Project.create({
        name: 'Test Project GET',
        description: 'Test project for GET',
        owner: testUser._id,
        members: [{ user: testUser._id, role: 'OWNER' }]
      });
    });

    it('should get all projects for user', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/projects/:id', () => {
    beforeEach(async () => {
      testUser = await User.create({
        name: 'Project Test User',
        email: 'projecttest3@example.com',
        password: 'TestPassword123!'
      });
      testToken = generateTestToken(testUser);

      testProject = await Project.create({
        name: 'Test Project Detail',
        description: 'Test project for detail',
        owner: testUser._id,
        members: [{ user: testUser._id, role: 'OWNER' }]
      });
    });

    it('should get project by ID', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject._id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('name', 'Test Project Detail');
    });

    it('should reject invalid project ID', async () => {
      const res = await request(app)
        .get('/api/projects/invalid-id')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/projects/:id', () => {
    beforeEach(async () => {
      testUser = await User.create({
        name: 'Project Test User',
        email: 'projecttest4@example.com',
        password: 'TestPassword123!'
      });
      testToken = generateTestToken(testUser);

      testProject = await Project.create({
        name: 'Test Project Update',
        description: 'Original description',
        owner: testUser._id,
        members: [{ user: testUser._id, role: 'OWNER' }]
      });
    });

    it('should update project successfully', async () => {
      const res = await request(app)
        .put(`/api/projects/${testProject._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          name: 'Updated Project Name',
          description: 'Updated description'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('name', 'Updated Project Name');
    });

    it('should reject update from non-member', async () => {
      // Create another user
      const otherUser = await User.create({
        name: 'Other User',
        email: 'otheruser4@example.com',
        password: 'TestPassword123!'
      });
      const otherToken = generateTestToken(otherUser);

      const res = await request(app)
        .put(`/api/projects/${testProject._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          name: 'Hacked Name'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);

      await User.findByIdAndDelete(otherUser._id);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    beforeEach(async () => {
      testUser = await User.create({
        name: 'Project Test User',
        email: 'projecttest5@example.com',
        password: 'TestPassword123!'
      });
      testToken = generateTestToken(testUser);

      testProject = await Project.create({
        name: 'Test Project Delete',
        description: 'Test project for delete',
        owner: testUser._id,
        members: [{ user: testUser._id, role: 'OWNER' }]
      });
    });

    it('should delete project successfully', async () => {
      const res = await request(app)
        .delete(`/api/projects/${testProject._id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject delete from non-owner', async () => {
      const memberUser = await User.create({
        name: 'Member User',
        email: 'memberuser5@example.com',
        password: 'TestPassword123!'
      });
      const memberToken = generateTestToken(memberUser);

      // Add as member (not owner)
      testProject.members.push({ user: memberUser._id, role: 'MEMBER' });
      await testProject.save();

      const res = await request(app)
        .delete(`/api/projects/${testProject._id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);

      await User.findByIdAndDelete(memberUser._id);
    });
  });

  describe('PATCH /api/projects/:id/archive', () => {
    beforeEach(async () => {
      testUser = await User.create({
        name: 'Project Test User',
        email: 'projecttest6@example.com',
        password: 'TestPassword123!'
      });
      testToken = generateTestToken(testUser);

      testProject = await Project.create({
        name: 'Test Project Archive',
        description: 'Test project for archive',
        owner: testUser._id,
        members: [{ user: testUser._id, role: 'OWNER' }],
        isArchived: false
      });
    });

    it('should archive project successfully', async () => {
      const res = await request(app)
        .patch(`/api/projects/${testProject._id}/archive`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ isArchived: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isArchived).toBe(true);
    });
  });

  describe('Permission checks', () => {
    let ownerUser;
    let adminUser;
    let memberUser;
    let ownerToken;
    let adminToken;
    let memberToken;

    beforeEach(async () => {
      ownerUser = await User.create({
        name: 'Owner User',
        email: 'ownerperm@example.com',
        password: 'TestPassword123!'
      });
      adminUser = await User.create({
        name: 'Admin User',
        email: 'adminperm@example.com',
        password: 'TestPassword123!'
      });
      memberUser = await User.create({
        name: 'Member User',
        email: 'memberperm@example.com',
        password: 'TestPassword123!'
      });

      ownerToken = generateTestToken(ownerUser);
      adminToken = generateTestToken(adminUser);
      memberToken = generateTestToken(memberUser);

      testProject = await Project.create({
        name: 'Test Permission Project',
        owner: ownerUser._id,
        members: [
          { user: ownerUser._id, role: 'OWNER' },
          { user: adminUser._id, role: 'ADMIN' },
          { user: memberUser._id, role: 'MEMBER' }
        ]
      });
    });

    afterEach(async () => {
      await User.findByIdAndDelete(adminUser._id);
      await User.findByIdAndDelete(memberUser._id);
    });

    it('should allow owner to delete project', async () => {
      const res = await request(app)
        .delete(`/api/projects/${testProject._id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
    });

    it('should allow admin to update project', async () => {
      const res = await request(app)
        .put(`/api/projects/${testProject._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated by Admin' });

      expect(res.status).toBe(200);
    });

    it('should allow member to view project', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject._id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
    });
  });
});
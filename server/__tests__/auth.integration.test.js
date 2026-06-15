/**
 * Auth Integration Tests
 * Tests for authentication endpoints
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../server.js';
import User from '../models/User.js';
import connectDB, { disconnectDB } from '../config/db.js';

const generateTestToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

describe('Auth Integration Tests', () => {
  let testUser;
  let testToken;

  beforeAll(async () => {
    // Ensure we're connected to test DB
    process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskflow_test';
    await connectDB();
  });

  afterAll(async () => {
    // Clean up test user
    if (testUser) {
      await User.findByIdAndDelete(testUser._id);
    }
    await disconnectDB();
  });

  beforeEach(async () => {
    // Clean up any existing test users
    await User.deleteMany({ email: { $regex: /test.*@example\.com$/ } });
    testUser = null;
    testToken = null;
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'testregister@example.com',
          password: 'TestPassword123!'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user).toHaveProperty('email', 'testregister@example.com');

      // Save user for cleanup
      testUser = await User.findOne({ email: 'testregister@example.com' });
    });

    it('should reject duplicate email registration', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'First User',
          email: 'duplicate@example.com',
          password: 'TestPassword123!'
        });

      // Second registration with same email
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Second User',
          email: 'duplicate@example.com',
          password: 'TestPassword123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'not-an-email',
          password: 'TestPassword123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'testweak@example.com',
          password: 'weak'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      testUser = await User.create({
        name: 'Login Test User',
        email: 'logintest@example.com',
        password: 'TestPassword123!'
      });
    });

    it('should login successfully with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logintest@example.com',
          password: 'TestPassword123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user).toHaveProperty('email', 'logintest@example.com');
    });

    it('should reject invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logintest@example.com',
          password: 'WrongPassword123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid credentials/i);
    });

    it('should reject non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'TestPassword123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('JWT Validation', () => {
    beforeEach(async () => {
      testUser = await User.create({
        name: 'JWT Test User',
        email: 'jwttest@example.com',
        password: 'TestPassword123!'
      });
      testToken = generateTestToken(testUser);
    });

    it('should validate a valid JWT token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject an invalid JWT token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject an expired JWT token', async () => {
      const expiredToken = jwt.sign(
        { id: testUser._id, email: testUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' } // Already expired
      );

      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject request without token', async () => {
      const res = await request(app)
        .get('/api/auth/profile');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    beforeEach(async () => {
      testUser = await User.create({
        name: 'Logout Test User',
        email: 'logouttest@example.com',
        password: 'TestPassword123!'
      });
      testToken = generateTestToken(testUser);
    });

    it('should logout successfully', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('PUT /api/auth/password', () => {
    beforeEach(async () => {
      testUser = await User.create({
        name: 'Password Test User',
        email: 'passwordtest@example.com',
        password: 'OldPassword123!'
      });
      testToken = generateTestToken(testUser);
    });

    it('should update password successfully', async () => {
      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify new password works
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'passwordtest@example.com',
          password: 'NewPassword123!'
        });

      expect(loginRes.status).toBe(200);
    });

    it('should reject incorrect current password', async () => {
      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/profile', () => {
    beforeEach(async () => {
      testUser = await User.create({
        name: 'Profile Test User',
        email: 'profiletest@example.com',
        password: 'TestPassword123!'
      });
      testToken = generateTestToken(testUser);
    });

    it('should get user profile successfully', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('email', 'profiletest@example.com');
    });
  });

  describe('PUT /api/auth/profile', () => {
    beforeEach(async () => {
      testUser = await User.create({
        name: 'Update Test User',
        email: 'updatetest@example.com',
        password: 'TestPassword123!'
      });
      testToken = generateTestToken(testUser);
    });

    it('should update user profile successfully', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          name: 'Updated Name'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('name', 'Updated Name');
    });
  });
});
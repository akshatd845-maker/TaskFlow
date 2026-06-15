import { jest, beforeAll, afterAll } from '@jest/globals';

// Set test environment BEFORE importing anything else that might read env
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jest-testing-only-32chars-min';
process.env.JWT_EXPIRE = '15m';
process.env.MONGODB_URI = 'mongodb://localhost:27017/taskflow_test';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.PORT = '5000';

// Mock console methods in test to reduce noise
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
  info: jest.fn()
};

// Global afterAll handler for cleanup
afterAll(async () => {
  // Close any open connections or cleanup
  jest.clearAllMocks();
});

// Global beforeEach for fresh mocks
beforeEach(() => {
  jest.clearAllMocks();
});
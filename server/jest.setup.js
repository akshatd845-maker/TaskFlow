/**
 * Jest Setup File
 *
 * Global setup and teardown for tests
 * Mock configurations
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jest-testing-only-32chars';
process.env.JWT_EXPIRE = '15m';
process.env.MONGO_URI = 'mongodb://localhost:27017/taskflow_test';

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
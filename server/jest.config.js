/**
 * Jest Configuration for TaskFlow Server
 *
 * Test environment: Node.js
 * Coverage enabled for comprehensive testing
 */

export default {
  testEnvironment: 'node',
  verbose: true,
  testTimeout: 10000,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    '**/*.js',
    '!server.js',
    '!socket.js',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/*.test.js',
    '**/*.spec.js'
  ],
  transform: {},
  moduleFileExtensions: ['js', 'mjs'],
  // Setup files
  setupFilesAfterEnv: ['./jest.setup.js'],
  // Mock external dependencies
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  }
};
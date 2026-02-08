/**
 * Jest test setup file
 * This file runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';

// Mock Electron modules for testing
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn((name: string) => {
      if (name === 'userData') return './test-data';
      if (name === 'logs') return './test-logs';
      return './test';
    }),
    on: jest.fn(),
    quit: jest.fn(),
    relaunch: jest.fn(),
  },
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
  },
  BrowserWindow: jest.fn(),
  dialog: {
    showErrorBox: jest.fn(),
  },
}));

// Global test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

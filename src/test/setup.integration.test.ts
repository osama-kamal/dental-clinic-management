/**
 * Integration test to verify project setup is complete and working
 */

import { DatabaseManager } from '../database/DatabaseManager';
import path from 'path';
import fs from 'fs';

describe('Project Setup Integration Test', () => {
  const testDbPath = path.join(__dirname, '../../test-data/integration-test.db');
  let dbManager: DatabaseManager;

  beforeAll(() => {
    // Ensure test directory exists
    const testDir = path.dirname(testDbPath);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  beforeEach(() => {
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync(`${testDbPath}-shm`)) {
      fs.unlinkSync(`${testDbPath}-shm`);
    }
    if (fs.existsSync(`${testDbPath}-wal`)) {
      fs.unlinkSync(`${testDbPath}-wal`);
    }

    dbManager = new DatabaseManager(testDbPath);
  });

  afterEach(() => {
    if (dbManager) {
      dbManager.close();
    }
  });

  describe('Database Infrastructure', () => {
    it('should initialize SQLite database with better-sqlite3', async () => {
      await dbManager.initialize();
      expect(fs.existsSync(testDbPath)).toBe(true);
    });

    it('should enable WAL mode for concurrent access', async () => {
      await dbManager.initialize();
      const db = dbManager.getDatabase();
      const result = db.pragma('journal_mode', { simple: true });
      expect(result[0].journal_mode).toBe('wal');
    });

    it('should support transactions with rollback', async () => {
      await dbManager.initialize();
      
      // Create test table
      dbManager.executeUpdate(`
        CREATE TABLE test_transactions (
          id INTEGER PRIMARY KEY,
          value TEXT
        )
      `);

      // Test successful transaction
      dbManager.executeTransaction(() => {
        dbManager.executeUpdate('INSERT INTO test_transactions (value) VALUES (?)', ['test1']);
        dbManager.executeUpdate('INSERT INTO test_transactions (value) VALUES (?)', ['test2']);
      });

      let results = dbManager.executeQuery('SELECT * FROM test_transactions');
      expect(results).toHaveLength(2);

      // Test failed transaction with rollback
      try {
        dbManager.executeTransaction(() => {
          dbManager.executeUpdate('INSERT INTO test_transactions (value) VALUES (?)', ['test3']);
          throw new Error('Simulated error');
        });
      } catch (error) {
        // Expected
      }

      results = dbManager.executeQuery('SELECT * FROM test_transactions');
      expect(results).toHaveLength(2); // Should still be 2, not 3
    });

    it('should create backups', async () => {
      await dbManager.initialize();
      
      const backupPath = path.join(__dirname, '../../test-data/backup-test.db');
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }

      await dbManager.backup(backupPath);
      expect(fs.existsSync(backupPath)).toBe(true);

      // Clean up
      fs.unlinkSync(backupPath);
    });
  });

  describe('IPC Communication Setup', () => {
    it('should have IPC handler setup function', () => {
      const { setupIpcHandlers } = require('../main/ipc/ipcHandlers');
      expect(typeof setupIpcHandlers).toBe('function');
    });
  });

  describe('Type Definitions', () => {
    it('should have shared types defined', () => {
      const types = require('../shared/types');
      expect(types).toBeDefined();
    });
  });

  describe('Testing Infrastructure', () => {
    it('should have Jest configured', () => {
      expect(jest).toBeDefined();
    });

    it('should have fast-check available', () => {
      const fc = require('fast-check');
      expect(fc).toBeDefined();
      expect(typeof fc.assert).toBe('function');
      expect(typeof fc.property).toBe('function');
    });
  });

  describe('Directory Structure', () => {
    it('should have main process directory', () => {
      const mainDir = path.join(__dirname, '../main');
      expect(fs.existsSync(mainDir)).toBe(true);
    });

    it('should have renderer process directory', () => {
      const rendererDir = path.join(__dirname, '../renderer');
      expect(fs.existsSync(rendererDir)).toBe(true);
    });

    it('should have shared directory', () => {
      const sharedDir = path.join(__dirname, '../shared');
      expect(fs.existsSync(sharedDir)).toBe(true);
    });

    it('should have database directory', () => {
      const databaseDir = path.join(__dirname, '../database');
      expect(fs.existsSync(databaseDir)).toBe(true);
    });
  });

  describe('Configuration Files', () => {
    it('should have package.json', () => {
      const packageJson = path.join(__dirname, '../../package.json');
      expect(fs.existsSync(packageJson)).toBe(true);
      
      const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf-8'));
      expect(pkg.name).toBe('dental-clinic-management');
      expect(pkg.dependencies).toHaveProperty('better-sqlite3');
      expect(pkg.dependencies).toHaveProperty('react');
      expect(pkg.dependencies).toHaveProperty('fast-check');
      expect(pkg.devDependencies).toHaveProperty('electron');
      expect(pkg.devDependencies).toHaveProperty('jest');
      expect(pkg.devDependencies).toHaveProperty('typescript');
    });

    it('should have TypeScript configuration', () => {
      const tsconfig = path.join(__dirname, '../../tsconfig.json');
      const tsconfigMain = path.join(__dirname, '../../tsconfig.main.json');
      expect(fs.existsSync(tsconfig)).toBe(true);
      expect(fs.existsSync(tsconfigMain)).toBe(true);
    });

    it('should have Jest configuration', () => {
      const jestConfig = path.join(__dirname, '../../jest.config.js');
      expect(fs.existsSync(jestConfig)).toBe(true);
    });

    it('should have Vite configuration', () => {
      const viteConfig = path.join(__dirname, '../../vite.config.ts');
      expect(fs.existsSync(viteConfig)).toBe(true);
    });
  });
});

import { DatabaseManager } from './DatabaseManager';
import fs from 'fs';
import path from 'path';

describe('DatabaseManager', () => {
  let dbManager: DatabaseManager;
  const testDbPath = path.join(__dirname, '../../test-data/test.db');

  beforeEach(async () => {
    // Clean up test database
    const testDir = path.dirname(testDbPath);
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

  describe('initialization', () => {
    it('should initialize database successfully', async () => {
      await expect(dbManager.initialize()).resolves.not.toThrow();
    });

    it('should create database file', async () => {
      await dbManager.initialize();
      expect(fs.existsSync(testDbPath)).toBe(true);
    });

    it('should enable WAL mode', async () => {
      await dbManager.initialize();
      const db = dbManager.getDatabase();
      const result = db.pragma('journal_mode', { simple: true });
      expect(result[0].journal_mode).toBe('wal');
    });

    it('should enable foreign keys', async () => {
      await dbManager.initialize();
      const db = dbManager.getDatabase();
      const result = db.pragma('foreign_keys', { simple: true });
      expect(result[0].foreign_keys).toBe(1);
    });
  });

  describe('query execution', () => {
    beforeEach(async () => {
      await dbManager.initialize();
    });

    it('should execute SELECT query', () => {
      const result = dbManager.executeQuery('SELECT 1 as test');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ test: 1 });
    });

    it('should execute query with parameters', () => {
      const result = dbManager.executeQuery('SELECT ? as value', [42]);
      expect(result[0]).toEqual({ value: 42 });
    });

    it('should execute single result query', () => {
      const result = dbManager.executeQueryOne('SELECT 1 as test');
      expect(result).toEqual({ test: 1 });
    });

    it('should return null for empty result', () => {
      const result = dbManager.executeQueryOne('SELECT 1 as test WHERE 1 = 0');
      expect(result).toBeNull();
    });
  });

  describe('transactions', () => {
    beforeEach(async () => {
      await dbManager.initialize();
      // Create a test table
      dbManager.executeUpdate(`
        CREATE TABLE test_table (
          id INTEGER PRIMARY KEY,
          value TEXT
        )
      `);
    });

    it('should commit successful transaction', () => {
      dbManager.executeTransaction(() => {
        dbManager.executeUpdate('INSERT INTO test_table (value) VALUES (?)', ['test1']);
        dbManager.executeUpdate('INSERT INTO test_table (value) VALUES (?)', ['test2']);
      });

      const results = dbManager.executeQuery('SELECT * FROM test_table');
      expect(results).toHaveLength(2);
    });

    it('should rollback failed transaction', () => {
      try {
        dbManager.executeTransaction(() => {
          dbManager.executeUpdate('INSERT INTO test_table (value) VALUES (?)', ['test1']);
          // This will fail due to invalid SQL
          dbManager.executeUpdate('INVALID SQL');
        });
      } catch (error) {
        // Expected to throw
      }

      const results = dbManager.executeQuery('SELECT * FROM test_table');
      expect(results).toHaveLength(0);
    });
  });

  describe('backup', () => {
    beforeEach(async () => {
      await dbManager.initialize();
    });

    it('should create backup file', async () => {
      const backupPath = path.join(__dirname, '../../test-data/backup.db');
      
      // Clean up backup if exists
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }

      await dbManager.backup(backupPath);
      expect(fs.existsSync(backupPath)).toBe(true);

      // Clean up
      fs.unlinkSync(backupPath);
    });
  });

  describe('close', () => {
    it('should close database connection', async () => {
      await dbManager.initialize();
      dbManager.close();
      
      // Attempting to query after close should throw
      expect(() => {
        dbManager.executeQuery('SELECT 1');
      }).toThrow('Database not initialized');
    });
  });
});

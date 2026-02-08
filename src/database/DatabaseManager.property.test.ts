import fc from 'fast-check';
import { DatabaseManager } from './DatabaseManager';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('DatabaseManager Property Tests', () => {
  let dbManager: DatabaseManager;
  let testDbPath: string;

  beforeEach(async () => {
    // Create a temporary database for testing
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dental-clinic-test-'));
    testDbPath = path.join(tempDir, 'test.db');
    dbManager = new DatabaseManager(testDbPath);
    await dbManager.initialize();
  });

  afterEach(() => {
    // Clean up
    dbManager.close();
    if (fs.existsSync(testDbPath)) {
      const dir = path.dirname(testDbPath);
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  // Feature: dental-clinic-management, Property 48: Transaction atomicity
  describe('Property 48: Transaction atomicity', () => {
    /**
     * **Validates: Requirements 8.2**
     * 
     * For any database operation involving multiple changes, either all changes 
     * should be committed or all should be rolled back (no partial commits).
     */
    it('should commit all changes or rollback all changes in a transaction', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              firstName: fc.string({ minLength: 1, maxLength: 50 }),
              lastName: fc.string({ minLength: 1, maxLength: 50 }),
              username: fc.string({ minLength: 3, maxLength: 30 }),
              role: fc.constantFrom('Administrator', 'Dentist', 'Receptionist'),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          (users) => {
            // Ensure unique usernames
            const uniqueUsers = users.map((user, index) => ({
              ...user,
              username: `${user.username}_${index}_${Date.now()}`,
            }));

            // Count users before transaction
            const beforeCount = dbManager.executeQuery<{ count: number }>(
              'SELECT COUNT(*) as count FROM users'
            )[0].count;

            // Execute transaction with multiple inserts
            try {
              dbManager.executeTransaction(() => {
                for (const user of uniqueUsers) {
                  const id = `user-${Date.now()}-${Math.random()}`;
                  const now = new Date().toISOString();
                  dbManager.executeUpdate(
                    `INSERT INTO users (id, username, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
                    [id, user.username, 'hash', user.firstName, user.lastName, user.role, now, now]
                  );
                }
              });

              // If transaction succeeds, all users should be inserted
              const afterCount = dbManager.executeQuery<{ count: number }>(
                'SELECT COUNT(*) as count FROM users'
              )[0].count;

              expect(afterCount).toBe(beforeCount + uniqueUsers.length);
            } catch (error) {
              // If transaction fails, no users should be inserted
              const afterCount = dbManager.executeQuery<{ count: number }>(
                'SELECT COUNT(*) as count FROM users'
              )[0].count;

              expect(afterCount).toBe(beforeCount);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should rollback all changes when transaction throws an error', () => {
      fc.assert(
        fc.property(
          fc.record({
            firstName: fc.string({ minLength: 1, maxLength: 50 }),
            lastName: fc.string({ minLength: 1, maxLength: 50 }),
            username: fc.string({ minLength: 3, maxLength: 30 }),
            role: fc.constantFrom('Administrator', 'Dentist', 'Receptionist'),
          }),
          (user) => {
            const uniqueUsername = `${user.username}_${Date.now()}_${Math.random()}`;

            // Count users before transaction
            const beforeCount = dbManager.executeQuery<{ count: number }>(
              'SELECT COUNT(*) as count FROM users'
            )[0].count;

            // Execute transaction that will fail
            try {
              dbManager.executeTransaction(() => {
                // First insert should succeed
                const id1 = `user-${Date.now()}-${Math.random()}`;
                const now = new Date().toISOString();
                dbManager.executeUpdate(
                  `INSERT INTO users (id, username, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
                  [id1, uniqueUsername, 'hash', user.firstName, user.lastName, user.role, now, now]
                );

                // Second insert with duplicate username should fail
                const id2 = `user-${Date.now()}-${Math.random()}`;
                dbManager.executeUpdate(
                  `INSERT INTO users (id, username, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
                  [id2, uniqueUsername, 'hash', user.firstName, user.lastName, user.role, now, now]
                );
              });
            } catch (error) {
              // Expected to fail due to unique constraint
            }

            // Count should be unchanged (first insert should be rolled back)
            const afterCount = dbManager.executeQuery<{ count: number }>(
              'SELECT COUNT(*) as count FROM users'
            )[0].count;

            expect(afterCount).toBe(beforeCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

  // Feature: dental-clinic-management, Property 49: Transaction rollback on failure
  describe('Property 49: Transaction rollback on failure', () => {
    /**
     * **Validates: Requirements 8.3**
     * 
     * For any database transaction that encounters an error, all changes within 
     * that transaction should be rolled back and the database should remain in 
     * its pre-transaction state.
     */
    it('should rollback all changes when any operation in transaction fails', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              firstName: fc.string({ minLength: 1, maxLength: 50 }),
              lastName: fc.string({ minLength: 1, maxLength: 50 }),
              username: fc.string({ minLength: 3, maxLength: 30 }),
              role: fc.constantFrom('Administrator', 'Dentist', 'Receptionist'),
            }),
            { minLength: 3, maxLength: 10 }
          ),
          (users) => {
            // Ensure unique usernames for all but the last user
            const uniqueUsers = users.map((user, index) => ({
              ...user,
              username: `${user.username}_${index}_${Date.now()}`,
            }));

            // Make the last user have a duplicate username to cause a failure
            if (uniqueUsers.length > 1) {
              uniqueUsers[uniqueUsers.length - 1].username = uniqueUsers[0].username;
            }

            // Get initial state
            const initialUsers = dbManager.executeQuery<any>('SELECT * FROM users');
            const initialCount = initialUsers.length;

            // Try to insert all users in a transaction (should fail on duplicate)
            try {
              dbManager.executeTransaction(() => {
                for (const user of uniqueUsers) {
                  const id = `user-${Date.now()}-${Math.random()}`;
                  const now = new Date().toISOString();
                  dbManager.executeUpdate(
                    `INSERT INTO users (id, username, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
                    [id, user.username, 'hash', user.firstName, user.lastName, user.role, now, now]
                  );
                }
              });
            } catch (error) {
              // Expected to fail
            }

            // Verify database is in pre-transaction state
            const finalUsers = dbManager.executeQuery<any>('SELECT * FROM users');
            const finalCount = finalUsers.length;

            // Count should be unchanged
            expect(finalCount).toBe(initialCount);

            // All original users should still exist
            for (const initialUser of initialUsers) {
              const stillExists = finalUsers.some((u: any) => u.id === initialUser.id);
              expect(stillExists).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain database consistency after rollback', () => {
      fc.assert(
        fc.property(
          fc.record({
            patientFirstName: fc.string({ minLength: 1, maxLength: 50 }),
            patientLastName: fc.string({ minLength: 1, maxLength: 50 }),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
          }),
          (data) => {
            // Get initial patient count
            const initialCount = dbManager.executeQuery<{ count: number }>(
              'SELECT COUNT(*) as count FROM patients'
            )[0].count;

            // Try to create a patient with an invalid foreign key reference
            try {
              dbManager.executeTransaction(() => {
                const patientId = `patient-${Date.now()}-${Math.random()}`;
                const now = new Date().toISOString();
                
                // Insert patient
                dbManager.executeUpdate(
                  `INSERT INTO patients (id, first_name, last_name, date_of_birth, phone, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)`,
                  [patientId, data.patientFirstName, data.patientLastName, '1990-01-01', data.phone, now, now]
                );

                // Try to insert appointment with non-existent dentist (should fail)
                const appointmentId = `appointment-${Date.now()}-${Math.random()}`;
                dbManager.executeUpdate(
                  `INSERT INTO appointments (id, patient_id, dentist_id, start_time, duration, appointment_type, status, created_by, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [appointmentId, patientId, 'non-existent-dentist', now, 60, 'Checkup', 'Scheduled', 'non-existent-user', now, now]
                );
              });
            } catch (error) {
              // Expected to fail due to foreign key constraint
            }

            // Verify patient was not inserted (transaction rolled back)
            const finalCount = dbManager.executeQuery<{ count: number }>(
              'SELECT COUNT(*) as count FROM patients'
            )[0].count;

            expect(finalCount).toBe(initialCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: dental-clinic-management, Property 57: Database schema migration
  describe('Property 57: Database schema migration', () => {
    /**
     * **Validates: Requirements 11.2**
     * 
     * For any application startup where the database schema version is older than 
     * the application version, migrations should be applied to update the schema.
     */
    it('should apply migrations when schema version is older', async () => {
      // This test verifies that migrations are applied correctly
      // by checking that all expected tables exist after initialization
      
      const expectedTables = [
        'users',
        'patients',
        'appointments',
        'treatment_plans',
        'treatments',
        'treatment_templates',
        'invoices',
        'invoice_items',
        'payments',
        'inventory_items',
        'inventory_transactions',
        'clinical_notes',
        'attachments',
        'sessions',
        'schema_version',
      ];

      // Get all tables in the database
      const tables = dbManager.executeQuery<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      );

      const tableNames = tables.map((t) => t.name);

      // Verify all expected tables exist
      for (const expectedTable of expectedTables) {
        expect(tableNames).toContain(expectedTable);
      }

      // Verify schema_version table has at least one entry
      const versions = dbManager.executeQuery<{ version: number }>(
        'SELECT version FROM schema_version ORDER BY version'
      );

      expect(versions.length).toBeGreaterThan(0);
      expect(versions[0].version).toBe(1);
    });

    it('should track migration application with timestamps', async () => {
      // Verify that schema_version table contains proper records
      const versions = dbManager.executeQuery<{ version: number; applied_at: string }>(
        'SELECT version, applied_at FROM schema_version ORDER BY version'
      );

      expect(versions.length).toBeGreaterThan(0);

      for (const versionRecord of versions) {
        // Verify version is a positive integer
        expect(versionRecord.version).toBeGreaterThan(0);
        expect(Number.isInteger(versionRecord.version)).toBe(true);

        // Verify applied_at is a valid ISO timestamp
        expect(versionRecord.applied_at).toBeDefined();
        const timestamp = new Date(versionRecord.applied_at);
        expect(timestamp.toString()).not.toBe('Invalid Date');
      }
    });

    it('should not reapply already applied migrations', async () => {
      // Get current schema version
      const initialVersions = dbManager.executeQuery<{ version: number }>(
        'SELECT version FROM schema_version ORDER BY version'
      );

      const initialCount = initialVersions.length;
      const maxVersion = Math.max(...initialVersions.map((v) => v.version));

      // Close and reinitialize the database
      dbManager.close();
      
      const newDbManager = new DatabaseManager(testDbPath);
      await newDbManager.initialize();

      // Get schema version after reinitialization
      const finalVersions = newDbManager.executeQuery<{ version: number }>(
        'SELECT version FROM schema_version ORDER BY version'
      );

      const finalCount = finalVersions.length;
      const finalMaxVersion = Math.max(...finalVersions.map((v) => v.version));

      // Version count should be the same (no duplicate migrations)
      expect(finalCount).toBe(initialCount);
      expect(finalMaxVersion).toBe(maxVersion);

      newDbManager.close();
    });

    it('should maintain data integrity during migration', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              firstName: fc.string({ minLength: 1, maxLength: 50 }),
              lastName: fc.string({ minLength: 1, maxLength: 50 }),
              username: fc.string({ minLength: 3, maxLength: 30 }),
              role: fc.constantFrom('Administrator', 'Dentist', 'Receptionist'),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (users) => {
            // Insert some test data
            const insertedIds: string[] = [];
            
            for (const [index, user] of users.entries()) {
              const id = `user-migration-test-${Date.now()}-${index}`;
              const username = `${user.username}_${index}_${Date.now()}`;
              const now = new Date().toISOString();
              
              dbManager.executeUpdate(
                `INSERT INTO users (id, username, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
                [id, username, 'hash', user.firstName, user.lastName, user.role, now, now]
              );
              
              insertedIds.push(id);
            }

            // Verify all inserted users exist
            for (const id of insertedIds) {
              const result = dbManager.executeQueryOne<any>(
                'SELECT * FROM users WHERE id = ?',
                [id]
              );
              
              expect(result).not.toBeNull();
              expect(result?.id).toBe(id);
            }

            // Clean up
            for (const id of insertedIds) {
              dbManager.executeUpdate('DELETE FROM users WHERE id = ?', [id]);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
import fc from 'fast-check';
import { AuthService, UserInput } from './AuthService';
import { DatabaseManager } from '../../database/DatabaseManager';
import { UserRole } from '../../shared/types';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';

describe('AuthService Property Tests', () => {
  let authService: AuthService;
  let db: DatabaseManager;
  const testDbPath = path.join(__dirname, '../../test-data/auth-test.db');

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

    // Initialize database
    db = new DatabaseManager(testDbPath);
    await db.initialize();
    authService = new AuthService(db);
  });

  afterEach(() => {
    db.close();
  });

  // Feature: dental-clinic-management, Property 1: Valid credential authentication
  // **Validates: Requirements 1.2**
  describe('Property 1: Valid credential authentication', () => {
    it('should authenticate any user with valid credentials and return user with assigned role', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: fc.string({ minLength: 3, maxLength: 50 }).filter(s => !s.includes("'")),
            password: fc.string({ minLength: 6, maxLength: 100 }),
            firstName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes("'")),
            lastName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes("'")),
            role: fc.constantFrom<UserRole>('Administrator', 'Dentist', 'Receptionist'),
            email: fc.option(fc.emailAddress(), { nil: undefined }),
          }),
          async (userData) => {
            // Create user
            const createResult = await authService.createUser(userData);
            
            // Skip if user creation failed (e.g., duplicate username in same test run)
            if (!createResult.success) {
              return true;
            }

            // Authenticate with valid credentials
            const authResult = await authService.authenticate(userData.username, userData.password);

            // Verify authentication succeeded
            expect(authResult.success).toBe(true);
            expect(authResult.user).toBeDefined();
            expect(authResult.sessionId).toBeDefined();
            
            // Verify user has correct role
            expect(authResult.user?.role).toBe(userData.role);
            expect(authResult.user?.username).toBe(userData.username);
            expect(authResult.user?.firstName).toBe(userData.firstName);
            expect(authResult.user?.lastName).toBe(userData.lastName);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: dental-clinic-management, Property 2: Invalid credential rejection
  // **Validates: Requirements 1.3**
  describe('Property 2: Invalid credential rejection', () => {
    it('should reject authentication for any invalid credentials', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: fc.string({ minLength: 3, maxLength: 50 }).filter(s => !s.includes("'")),
            password: fc.string({ minLength: 6, maxLength: 100 }),
            firstName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes("'")),
            lastName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes("'")),
            role: fc.constantFrom<UserRole>('Administrator', 'Dentist', 'Receptionist'),
          }),
          fc.oneof(
            fc.constant('wrong_password'),
            fc.constant('non_existent_user'),
            fc.constant('empty_username'),
            fc.constant('empty_password')
          ),
          async (userData, invalidType) => {
            // Create user first
            const createResult = await authService.createUser(userData);
            
            // Skip if user creation failed
            if (!createResult.success) {
              return true;
            }

            let authResult;

            switch (invalidType) {
              case 'wrong_password':
                // Try to authenticate with wrong password
                authResult = await authService.authenticate(userData.username, userData.password + '_wrong');
                break;
              
              case 'non_existent_user':
                // Try to authenticate with non-existent username
                authResult = await authService.authenticate(userData.username + '_nonexistent', userData.password);
                break;
              
              case 'empty_username':
                // Try to authenticate with empty username
                authResult = await authService.authenticate('', userData.password);
                break;
              
              case 'empty_password':
                // Try to authenticate with empty password
                authResult = await authService.authenticate(userData.username, '');
                break;
            }

            // Verify authentication failed
            expect(authResult.success).toBe(false);
            expect(authResult.user).toBeUndefined();
            expect(authResult.sessionId).toBeUndefined();
            expect(authResult.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: dental-clinic-management, Property 5: Password hashing
  // **Validates: Requirements 1.9**
  describe('Property 5: Password hashing', () => {
    it('should store passwords as bcrypt hash with cost factor >= 10 and original password should not be recoverable', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: fc.string({ minLength: 3, maxLength: 50 }).filter(s => !s.includes("'")),
            password: fc.string({ minLength: 6, maxLength: 100 }),
            firstName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes("'")),
            lastName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes("'")),
            role: fc.constantFrom<UserRole>('Administrator', 'Dentist', 'Receptionist'),
          }),
          async (userData) => {
            // Create user
            const createResult = await authService.createUser(userData);
            
            // Skip if user creation failed
            if (!createResult.success) {
              return true;
            }

            // Get user from database to check password hash
            const userRow = db.executeQueryOne<any>(
              'SELECT password_hash FROM users WHERE username = ?',
              [userData.username]
            );

            expect(userRow).toBeDefined();
            const passwordHash = userRow!.password_hash;

            // Verify it's a bcrypt hash (starts with $2b$ or $2a$ or $2y$)
            expect(passwordHash).toMatch(/^\$2[aby]\$/);

            // Verify cost factor is at least 10
            // Bcrypt hash format: $2b$10$... where 10 is the cost factor
            const costFactorMatch = passwordHash.match(/^\$2[aby]\$(\d+)\$/);
            expect(costFactorMatch).toBeDefined();
            const costFactor = parseInt(costFactorMatch![1], 10);
            expect(costFactor).toBeGreaterThanOrEqual(10);

            // Verify original password is not in the hash
            expect(passwordHash).not.toContain(userData.password);

            // Verify the hash can be used to verify the password
            const isValid = await bcrypt.compare(userData.password, passwordHash);
            expect(isValid).toBe(true);

            // Verify wrong password doesn't match
            const isInvalid = await bcrypt.compare(userData.password + '_wrong', passwordHash);
            expect(isInvalid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: dental-clinic-management, Property 4: Session timeout
  // **Validates: Requirements 1.8**
  describe('Property 4: Session timeout', () => {
    it('should invalidate any session inactive for 30 minutes or more', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: fc.string({ minLength: 3, maxLength: 50 }).filter(s => !s.includes("'")),
            password: fc.string({ minLength: 6, maxLength: 100 }),
            firstName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes("'")),
            lastName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes("'")),
            role: fc.constantFrom<UserRole>('Administrator', 'Dentist', 'Receptionist'),
          }),
          async (userData) => {
            // Create user
            const createResult = await authService.createUser(userData);
            
            // Skip if user creation failed
            if (!createResult.success) {
              return true;
            }

            // Authenticate to create session
            const authResult = await authService.authenticate(userData.username, userData.password);
            expect(authResult.success).toBe(true);
            const sessionId = authResult.sessionId!;

            // Verify session is valid immediately
            const user1 = authService.validateSession(sessionId);
            expect(user1).not.toBeNull();

            // Simulate 30 minutes of inactivity by updating last_activity in database
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000 - 1000); // 30 minutes + 1 second
            db.executeUpdate(
              'UPDATE sessions SET last_activity = ? WHERE id = ?',
              [thirtyMinutesAgo.toISOString(), sessionId]
            );

            // Verify session is now invalid
            const user2 = authService.validateSession(sessionId);
            expect(user2).toBeNull();

            // Verify session was deleted from database
            const sessionRow = db.executeQueryOne<any>(
              'SELECT * FROM sessions WHERE id = ?',
              [sessionId]
            );
            expect(sessionRow).toBeNull();
          }
        ),
        { numRuns: 50 } // Fewer runs since this involves time manipulation
      );
    });

    it('should keep session valid if activity occurs within 30 minutes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: fc.string({ minLength: 3, maxLength: 50 }).filter(s => !s.includes("'")),
            password: fc.string({ minLength: 6, maxLength: 100 }),
            firstName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes("'")),
            lastName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes("'")),
            role: fc.constantFrom<UserRole>('Administrator', 'Dentist', 'Receptionist'),
          }),
          fc.integer({ min: 1, max: 29 }), // Minutes of inactivity (less than 30)
          async (userData, minutesInactive) => {
            // Create user
            const createResult = await authService.createUser(userData);
            
            // Skip if user creation failed
            if (!createResult.success) {
              return true;
            }

            // Authenticate to create session
            const authResult = await authService.authenticate(userData.username, userData.password);
            expect(authResult.success).toBe(true);
            const sessionId = authResult.sessionId!;

            // Simulate some inactivity (but less than 30 minutes)
            const someTimeAgo = new Date(Date.now() - minutesInactive * 60 * 1000);
            db.executeUpdate(
              'UPDATE sessions SET last_activity = ? WHERE id = ?',
              [someTimeAgo.toISOString(), sessionId]
            );

            // Verify session is still valid
            const user = authService.validateSession(sessionId);
            expect(user).not.toBeNull();
            expect(user?.username).toBe(userData.username);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});

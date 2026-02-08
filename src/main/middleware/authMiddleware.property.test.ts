import fc from 'fast-check';
import { AuthService, UserInput } from '../services/AuthService';
import { DatabaseManager } from '../../database/DatabaseManager';
import { UserRole } from '../../shared/types';
import { createAuthMiddleware, hasPermission, ROLE_PERMISSIONS } from './authMiddleware';
import fs from 'fs';
import path from 'path';

describe('AuthMiddleware Property Tests', () => {
  let authService: AuthService;
  let db: DatabaseManager;
  let authorize: ReturnType<typeof createAuthMiddleware>;
  const testDbPath = path.join(__dirname, '../../test-data/auth-middleware-test.db');

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
    authorize = createAuthMiddleware(authService);
  });

  afterEach(() => {
    db.close();
  });

  // Feature: dental-clinic-management, Property 3: Role-based access control
  // **Validates: Requirements 1.5, 1.6, 1.7**
  describe('Property 3: Role-based access control', () => {
    it('should grant access to Administrator for all system functions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: fc.string({ minLength: 3, maxLength: 50 }).filter(s => !s.includes("'")),
            password: fc.string({ minLength: 6, maxLength: 100 }),
            firstName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes("'")),
            lastName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes("'")),
            role: fc.constant<UserRole>('Administrator'),
          }),
          async (userData) => {
            // Create administrator user
            const createResult = await authService.createUser(userData);
            if (!createResult.success) {
              return true;
            }

            // Authenticate
            const authResult = await authService.authenticate(userData.username, userData.password);
            expect(authResult.success).toBe(true);
            const sessionId = authResult.sessionId!;

            // Test all permissions defined in ROLE_PERMISSIONS
            const allPermissions = [
              'users:create', 'users:read', 'users:update', 'users:delete',
              'patients:create', 'patients:read', 'patients:update', 'patients:delete',
              'appointments:create', 'appointments:read', 'appointments:update', 'appointments:delete',
              'treatments:create', 'treatments:read', 'treatments:update', 'treatments:delete',
              'invoices:create', 'invoices:read', 'invoices:update', 'invoices:delete',
              'payments:create', 'payments:read',
              'inventory:create', 'inventory:read', 'inventory:update', 'inventory:delete',
              'reports:generate',
              'templates:create', 'templates:update', 'templates:delete',
              'clinical-notes:create', 'clinical-notes:read', 'clinical-notes:update',
              'attachments:create', 'attachments:read', 'attachments:delete',
            ];

            // Administrator should have access to all functions
            for (const permission of allPermissions) {
              const authContext = authorize(sessionId, { requiredPermission: permission });
              expect(authContext).not.toBeNull();
              expect(authContext?.user.role).toBe('Administrator');
            }
          }
        ),
        { numRuns: 20 } // Fewer runs since we test many permissions per run
      );
    });

    it('should grant Dentist access only to patient records, treatments, and appointments', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: fc.string({ minLength: 3, maxLength: 50 }).filter(s => !s.includes("'")),
            password: fc.string({ minLength: 6, maxLength: 100 }),
            firstName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes("'")),
            lastName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes("'")),
            role: fc.constant<UserRole>('Dentist'),
          }),
          async (userData) => {
            // Create dentist user
            const createResult = await authService.createUser(userData);
            if (!createResult.success) {
              return true;
            }

            // Authenticate
            const authResult = await authService.authenticate(userData.username, userData.password);
            expect(authResult.success).toBe(true);
            const sessionId = authResult.sessionId!;

            // Permissions Dentist SHOULD have
            const allowedPermissions = [
              'patients:create', 'patients:read', 'patients:update',
              'appointments:create', 'appointments:read', 'appointments:update',
              'treatments:create', 'treatments:read', 'treatments:update',
              'clinical-notes:create', 'clinical-notes:read', 'clinical-notes:update',
              'attachments:create', 'attachments:read',
              'reports:generate',
            ];

            // Permissions Dentist SHOULD NOT have
            const deniedPermissions = [
              'users:create', 'users:delete',
              'patients:delete',
              'appointments:delete',
              'treatments:delete',
              'invoices:create', 'invoices:update', 'invoices:delete',
              'payments:create',
              'inventory:create', 'inventory:delete',
              'templates:create', 'templates:delete',
            ];

            // Test allowed permissions
            for (const permission of allowedPermissions) {
              const authContext = authorize(sessionId, { requiredPermission: permission });
              expect(authContext).not.toBeNull();
              expect(authContext?.user.role).toBe('Dentist');
            }

            // Test denied permissions
            for (const permission of deniedPermissions) {
              const authContext = authorize(sessionId, { requiredPermission: permission });
              expect(authContext).toBeNull();
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should grant Receptionist access only to appointments, billing, and basic patient info', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: fc.string({ minLength: 3, maxLength: 50 }).filter(s => !s.includes("'")),
            password: fc.string({ minLength: 6, maxLength: 100 }),
            firstName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes("'")),
            lastName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes("'")),
            role: fc.constant<UserRole>('Receptionist'),
          }),
          async (userData) => {
            // Create receptionist user
            const createResult = await authService.createUser(userData);
            if (!createResult.success) {
              return true;
            }

            // Authenticate
            const authResult = await authService.authenticate(userData.username, userData.password);
            expect(authResult.success).toBe(true);
            const sessionId = authResult.sessionId!;

            // Permissions Receptionist SHOULD have
            const allowedPermissions = [
              'patients:create', 'patients:read', 'patients:update',
              'appointments:create', 'appointments:read', 'appointments:update',
              'invoices:create', 'invoices:read', 'invoices:update',
              'payments:create', 'payments:read',
              'reports:generate',
            ];

            // Permissions Receptionist SHOULD NOT have
            const deniedPermissions = [
              'users:create', 'users:delete',
              'patients:delete',
              'appointments:delete',
              'treatments:create', 'treatments:update', 'treatments:delete',
              'invoices:delete',
              'inventory:create', 'inventory:delete',
              'templates:create', 'templates:delete',
              'clinical-notes:create', 'clinical-notes:update',
              'attachments:create', 'attachments:delete',
            ];

            // Test allowed permissions
            for (const permission of allowedPermissions) {
              const authContext = authorize(sessionId, { requiredPermission: permission });
              expect(authContext).not.toBeNull();
              expect(authContext?.user.role).toBe('Receptionist');
            }

            // Test denied permissions
            for (const permission of deniedPermissions) {
              const authContext = authorize(sessionId, { requiredPermission: permission });
              expect(authContext).toBeNull();
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should deny access for any user-permission combination where user role lacks permission', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: fc.string({ minLength: 3, maxLength: 50 }).filter(s => !s.includes("'")),
            password: fc.string({ minLength: 6, maxLength: 100 }),
            firstName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes("'")),
            lastName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes("'")),
            role: fc.constantFrom<UserRole>('Dentist', 'Receptionist'), // Non-admin roles
          }),
          fc.constantFrom(
            'users:create', 'users:delete',
            'patients:delete',
            'appointments:delete',
            'inventory:delete',
            'templates:delete'
          ),
          async (userData, restrictedPermission) => {
            // Create user
            const createResult = await authService.createUser(userData);
            if (!createResult.success) {
              return true;
            }

            // Authenticate
            const authResult = await authService.authenticate(userData.username, userData.password);
            expect(authResult.success).toBe(true);
            const sessionId = authResult.sessionId!;

            // Check if user has this permission
            const user = authService.validateSession(sessionId);
            expect(user).not.toBeNull();
            
            const userHasPermission = hasPermission(user!, restrictedPermission);
            const authContext = authorize(sessionId, { requiredPermission: restrictedPermission });

            if (userHasPermission) {
              // If user has permission, authorization should succeed
              expect(authContext).not.toBeNull();
            } else {
              // If user lacks permission, authorization should fail
              expect(authContext).toBeNull();
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should grant access if and only if user role has permission for the function', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: fc.string({ minLength: 3, maxLength: 50 }).filter(s => !s.includes("'")),
            password: fc.string({ minLength: 6, maxLength: 100 }),
            firstName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes("'")),
            lastName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes("'")),
            role: fc.constantFrom<UserRole>('Administrator', 'Dentist', 'Receptionist'),
          }),
          fc.constantFrom(
            'patients:create', 'patients:read', 'patients:update', 'patients:delete',
            'appointments:create', 'appointments:read', 'appointments:update',
            'treatments:create', 'treatments:read',
            'invoices:create', 'invoices:read',
            'users:create', 'users:delete',
            'inventory:create', 'inventory:delete'
          ),
          async (userData, permission) => {
            // Create user
            const createResult = await authService.createUser(userData);
            if (!createResult.success) {
              return true;
            }

            // Authenticate
            const authResult = await authService.authenticate(userData.username, userData.password);
            expect(authResult.success).toBe(true);
            const sessionId = authResult.sessionId!;

            // Get user
            const user = authService.validateSession(sessionId);
            expect(user).not.toBeNull();

            // Check if role has permission
            const roleHasPermission = ROLE_PERMISSIONS[userData.role].includes(permission);

            // Try to authorize with this permission
            const authContext = authorize(sessionId, { requiredPermission: permission });

            // Access should be granted if and only if role has permission
            if (roleHasPermission) {
              expect(authContext).not.toBeNull();
              expect(authContext?.user.role).toBe(userData.role);
            } else {
              expect(authContext).toBeNull();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

import { AuthService } from '../services/AuthService';
import { User, UserRole } from '../../shared/types';
import { logger } from '../utils/logger';

/**
 * Permission definitions for each role
 * Validates: Requirements 1.5, 1.6, 1.7
 */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  Administrator: [
    // All permissions
    'users:create',
    'users:read',
    'users:update',
    'users:delete',
    'patients:create',
    'patients:read',
    'patients:update',
    'patients:delete',
    'appointments:create',
    'appointments:read',
    'appointments:update',
    'appointments:delete',
    'treatments:create',
    'treatments:read',
    'treatments:update',
    'treatments:delete',
    'invoices:create',
    'invoices:read',
    'invoices:update',
    'invoices:delete',
    'payments:create',
    'payments:read',
    'inventory:create',
    'inventory:read',
    'inventory:update',
    'inventory:delete',
    'reports:generate',
    'templates:create',
    'templates:update',
    'templates:delete',
    'clinical-notes:create',
    'clinical-notes:read',
    'clinical-notes:update',
    'attachments:create',
    'attachments:read',
    'attachments:delete',
  ],
  Dentist: [
    // Patient records, treatments, and appointments
    'patients:create',
    'patients:read',
    'patients:update',
    'appointments:create',
    'appointments:read',
    'appointments:update',
    'treatments:create',
    'treatments:read',
    'treatments:update',
    'clinical-notes:create',
    'clinical-notes:read',
    'clinical-notes:update',
    'attachments:create',
    'attachments:read',
    'reports:generate',
  ],
  Receptionist: [
    // Appointments, billing, and basic patient info
    'patients:create',
    'patients:read',
    'patients:update',
    'appointments:create',
    'appointments:read',
    'appointments:update',
    'invoices:create',
    'invoices:read',
    'invoices:update',
    'payments:create',
    'payments:read',
    'reports:generate',
  ],
};

/**
 * Check if a user has permission to perform an action
 */
export function hasPermission(user: User, permission: string): boolean {
  const rolePermissions = ROLE_PERMISSIONS[user.role];
  return rolePermissions.includes(permission);
}

/**
 * Authorization middleware for IPC handlers
 */
export interface AuthContext {
  user: User;
  sessionId: string;
}

export interface AuthMiddlewareOptions {
  requiredPermission?: string;
  allowedRoles?: UserRole[];
}

/**
 * Create authorization middleware
 */
export function createAuthMiddleware(authService: AuthService) {
  /**
   * Validate session and check permissions
   */
  return function authorize(
    sessionId: string,
    options?: AuthMiddlewareOptions
  ): AuthContext | null {
    try {
      // Validate session
      const user = authService.validateSession(sessionId);
      if (!user) {
        logger.warn('Invalid or expired session', { sessionId });
        return null;
      }

      // Check role-based access if specified
      if (options?.allowedRoles && !options.allowedRoles.includes(user.role)) {
        logger.warn('User role not allowed', {
          userId: user.id,
          role: user.role,
          allowedRoles: options.allowedRoles,
        });
        return null;
      }

      // Check permission if specified
      if (options?.requiredPermission && !hasPermission(user, options.requiredPermission)) {
        logger.warn('User lacks required permission', {
          userId: user.id,
          role: user.role,
          requiredPermission: options.requiredPermission,
        });
        return null;
      }

      return { user, sessionId };
    } catch (error) {
      logger.error('Authorization failed', { sessionId, error });
      return null;
    }
  };
}

/**
 * Helper to check if user can perform action
 */
export function canPerformAction(user: User, action: string): boolean {
  return hasPermission(user, action);
}

/**
 * Helper to get all permissions for a role
 */
export function getRolePermissions(role: UserRole): string[] {
  return ROLE_PERMISSIONS[role];
}

/**
 * Helper to check if role has access to a resource
 */
export function hasResourceAccess(role: UserRole, resource: string): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.some(p => p.startsWith(resource + ':'));
}

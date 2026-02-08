import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseManager } from '../../database/DatabaseManager';
import { User, UserRole, Session, ApiResponse } from '../../shared/types';
import { logger } from '../utils/logger';

const BCRYPT_COST_FACTOR = 10;
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export interface UserInput {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  email?: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  sessionId?: string;
  error?: string;
}

export class AuthService {
  constructor(private db: DatabaseManager) {}

  /**
   * Authenticate a user with username and password
   * Validates: Requirements 1.2, 1.3
   */
  async authenticate(username: string, password: string): Promise<AuthResult> {
    try {
      // Validate input
      if (!username || !password) {
        return {
          success: false,
          error: 'Username and password are required',
        };
      }

      // Find user by username
      const userRow = this.db.executeQueryOne<any>(
        'SELECT * FROM users WHERE username = ? AND is_active = 1',
        [username]
      );

      if (!userRow) {
        return {
          success: false,
          error: 'Invalid username or password',
        };
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, userRow.password_hash);
      if (!passwordMatch) {
        return {
          success: false,
          error: 'Invalid username or password',
        };
      }

      // Create session
      const sessionId = uuidv4();
      const now = new Date().toISOString();
      
      this.db.executeUpdate(
        'INSERT INTO sessions (id, user_id, created_at, last_activity) VALUES (?, ?, ?, ?)',
        [sessionId, userRow.id, now, now]
      );

      // Convert database row to User object
      const user = this.mapRowToUser(userRow);

      logger.info('User authenticated successfully', { userId: user.id, username: user.username });

      return {
        success: true,
        user,
        sessionId,
      };
    } catch (error) {
      logger.error('Authentication failed', { username, error });
      return {
        success: false,
        error: 'Authentication failed',
      };
    }
  }

  /**
   * Create a new user with hashed password
   * Validates: Requirements 1.9
   */
  async createUser(data: UserInput): Promise<ApiResponse<User>> {
    try {
      // Validate required fields
      if (!data.username || !data.password || !data.firstName || !data.lastName || !data.role) {
        return {
          success: false,
          error: 'Missing required fields',
        };
      }

      // Validate role
      const validRoles: UserRole[] = ['Administrator', 'Dentist', 'Receptionist'];
      if (!validRoles.includes(data.role)) {
        return {
          success: false,
          error: 'Invalid role',
        };
      }

      // Check if username already exists
      const existingUser = this.db.executeQueryOne<any>(
        'SELECT id FROM users WHERE username = ?',
        [data.username]
      );

      if (existingUser) {
        return {
          success: false,
          error: 'Username already exists',
        };
      }

      // Hash password with bcrypt cost factor 10
      const passwordHash = await bcrypt.hash(data.password, BCRYPT_COST_FACTOR);

      // Create user
      const userId = uuidv4();
      const now = new Date().toISOString();

      this.db.executeUpdate(
        `INSERT INTO users (id, username, password_hash, first_name, last_name, role, email, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [userId, data.username, passwordHash, data.firstName, data.lastName, data.role, data.email || null, now, now]
      );

      // Retrieve created user
      const userRow = this.db.executeQueryOne<any>(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );

      const user = this.mapRowToUser(userRow!);

      logger.info('User created successfully', { userId: user.id, username: user.username });

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      logger.error('User creation failed', { username: data.username, error });
      return {
        success: false,
        error: 'User creation failed',
      };
    }
  }

  /**
   * Update user information
   */
  async updateUser(id: string, data: Partial<UserInput>): Promise<ApiResponse<User>> {
    try {
      // Check if user exists
      const existingUser = this.db.executeQueryOne<any>(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );

      if (!existingUser) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      const updates: string[] = [];
      const params: any[] = [];

      if (data.firstName) {
        updates.push('first_name = ?');
        params.push(data.firstName);
      }

      if (data.lastName) {
        updates.push('last_name = ?');
        params.push(data.lastName);
      }

      if (data.role) {
        updates.push('role = ?');
        params.push(data.role);
      }

      if (data.email !== undefined) {
        updates.push('email = ?');
        params.push(data.email || null);
      }

      if (updates.length === 0) {
        return {
          success: false,
          error: 'No fields to update',
        };
      }

      updates.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(id);

      this.db.executeUpdate(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      // Retrieve updated user
      const userRow = this.db.executeQueryOne<any>(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );

      const user = this.mapRowToUser(userRow!);

      logger.info('User updated successfully', { userId: user.id });

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      logger.error('User update failed', { userId: id, error });
      return {
        success: false,
        error: 'User update failed',
      };
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<ApiResponse<boolean>> {
    try {
      // Get user
      const userRow = this.db.executeQueryOne<any>(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );

      if (!userRow) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // Verify old password
      const passwordMatch = await bcrypt.compare(oldPassword, userRow.password_hash);
      if (!passwordMatch) {
        return {
          success: false,
          error: 'Current password is incorrect',
        };
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_COST_FACTOR);

      // Update password
      this.db.executeUpdate(
        'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
        [newPasswordHash, new Date().toISOString(), userId]
      );

      logger.info('Password changed successfully', { userId });

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      logger.error('Password change failed', { userId, error });
      return {
        success: false,
        error: 'Password change failed',
      };
    }
  }

  /**
   * Validate a session and return the user
   * Validates: Requirements 1.8 (session timeout)
   */
  validateSession(sessionId: string): User | null {
    try {
      // Get session
      const sessionRow = this.db.executeQueryOne<any>(
        'SELECT * FROM sessions WHERE id = ?',
        [sessionId]
      );

      if (!sessionRow) {
        return null;
      }

      // Check session timeout (30 minutes)
      const lastActivity = new Date(sessionRow.last_activity);
      const now = new Date();
      const timeSinceActivity = now.getTime() - lastActivity.getTime();

      if (timeSinceActivity > SESSION_TIMEOUT_MS) {
        // Session expired, delete it
        this.db.executeUpdate('DELETE FROM sessions WHERE id = ?', [sessionId]);
        logger.info('Session expired', { sessionId });
        return null;
      }

      // Update last activity
      this.db.executeUpdate(
        'UPDATE sessions SET last_activity = ? WHERE id = ?',
        [now.toISOString(), sessionId]
      );

      // Get user
      const userRow = this.db.executeQueryOne<any>(
        'SELECT * FROM users WHERE id = ? AND is_active = 1',
        [sessionRow.user_id]
      );

      if (!userRow) {
        return null;
      }

      return this.mapRowToUser(userRow);
    } catch (error) {
      logger.error('Session validation failed', { sessionId, error });
      return null;
    }
  }

  /**
   * Logout a user by deleting their session
   */
  logout(sessionId: string): void {
    try {
      this.db.executeUpdate('DELETE FROM sessions WHERE id = ?', [sessionId]);
      logger.info('User logged out', { sessionId });
    } catch (error) {
      logger.error('Logout failed', { sessionId, error });
    }
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): void {
    try {
      const cutoffTime = new Date(Date.now() - SESSION_TIMEOUT_MS).toISOString();
      const result = this.db.executeUpdate(
        'DELETE FROM sessions WHERE last_activity < ?',
        [cutoffTime]
      );
      
      if (result.changes > 0) {
        logger.info('Expired sessions cleaned up', { count: result.changes });
      }
    } catch (error) {
      logger.error('Session cleanup failed', { error });
    }
  }

  /**
   * Get user by ID
   */
  getUserById(userId: string): User | null {
    try {
      const userRow = this.db.executeQueryOne<any>(
        'SELECT * FROM users WHERE id = ? AND is_active = 1',
        [userId]
      );

      if (!userRow) {
        return null;
      }

      return this.mapRowToUser(userRow);
    } catch (error) {
      logger.error('Get user by ID failed', { userId, error });
      return null;
    }
  }

  /**
   * Map database row to User object
   */
  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      username: row.username,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role as UserRole,
      email: row.email || undefined,
      isActive: row.is_active === 1,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

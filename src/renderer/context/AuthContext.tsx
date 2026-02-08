import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ipcClient } from '../api/ipcClient';

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'Administrator' | 'Dentist' | 'Receptionist';
  email?: string;
}

interface AuthContextType {
  user: User | null;
  sessionId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const storedSessionId = localStorage.getItem('sessionId');
    if (storedSessionId) {
      validateSession(storedSessionId);
    } else {
      setIsLoading(false);
    }
  }, []);

  const validateSession = async (sid: string) => {
    try {
      const response = await ipcClient.validateSession(sid);
      if (response.success && response.data) {
        setUser(response.data);
        setSessionId(sid);
      } else {
        localStorage.removeItem('sessionId');
      }
    } catch (error) {
      console.error('Session validation failed:', error);
      localStorage.removeItem('sessionId');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await ipcClient.login(username, password);
      
      if (response.success && response.data) {
        const { user: userData, sessionId: sid } = response.data;
        setUser(userData);
        setSessionId(sid);
        localStorage.setItem('sessionId', sid);
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Login failed' };
      }
    } catch (error) {
      return { success: false, error: 'Connection error' };
    }
  };

  const logout = async () => {
    try {
      if (sessionId) {
        await ipcClient.logout(sessionId);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setSessionId(null);
      localStorage.removeItem('sessionId');
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;

    // Administrator has all permissions
    if (user.role === 'Administrator') return true;

    // Define role-based permissions
    const permissions: Record<string, string[]> = {
      Dentist: [
        'patients:read',
        'patients:write',
        'appointments:read',
        'appointments:write',
        'treatments:read',
        'treatments:write',
        'clinicalNotes:read',
        'clinicalNotes:write',
      ],
      Receptionist: [
        'patients:read',
        'patients:write:basic',
        'appointments:read',
        'appointments:write',
        'billing:read',
        'billing:write',
      ],
    };

    return permissions[user.role]?.includes(permission) || false;
  };

  const value: AuthContextType = {
    user,
    sessionId,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

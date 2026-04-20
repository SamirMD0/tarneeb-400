// frontend/hooks/useAuth.ts
// Provides auth state and actions to any component that needs them.
// Reads initial state from localStorage so the UI is correct on page load.
// Uses React Context to share state across components globally.

'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import {
  loginUser,
  registerUser,
  logoutUser,
  getStoredUser,
  type AuthUser,
} from '@/lib/auth';
import { getSocket } from '@/lib/socketSingleton';

export interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Read initial user state on mount to avoid hydration mismatch 
  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const result = await loginUser(email, password);
      setUser(result.user);
      const socket = getSocket();
      if (socket) {
        socket.disconnect();
        socket.connect();
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const result = await registerUser(name, email, password);
        setUser(result.user);
        const socket = getSocket();
        if (socket) {
          socket.disconnect();
          socket.connect();
        }
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const logout = useCallback(() => {
    logoutUser();
    setUser(null);
    const socket = getSocket();
    if (socket) {
      socket.disconnect();
      // Only connect anonymously if you expect guests to be able to do things, 
      // otherwise stay disconnected until next login.
      socket.connect();
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
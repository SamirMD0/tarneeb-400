// frontend/hooks/useAuth.ts
// Provides auth state and actions to any component that needs them.
// Reads initial state from localStorage so the UI is correct on page load.
// Works alongside useAppState — does not replace it.

'use client';

import { useState, useCallback } from 'react';
import {
  loginUser,
  registerUser,
  logoutUser,
  getStoredUser,
  type AuthUser,
} from '@/lib/auth';

export interface UseAuthReturn {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser]       = useState<AuthUser | null>(() => getStoredUser());
  const [isLoading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const result = await loginUser(email, password);
      setUser(result.user);
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
  }, []);

  return { user, isLoading, error, login, register, logout };
}
// frontend/lib/auth.ts
// Auth API calls and token storage helpers.
// Token is kept in localStorage. Components read auth state via useAuth().

import { ENV } from './env';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthResult {
  token: string;
  user: AuthUser;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

const TOKEN_KEY = 'tarneeb_token';
const USER_KEY  = 'tarneeb_user';

export const tokenStorage = {
  get(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  set(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export const userStorage = {
  get(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_KEY);
    try { return raw ? (JSON.parse(raw) as AuthUser) : null; } catch { return null; }
  },
  set(user: AuthUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
};

// ─── API calls ────────────────────────────────────────────────────────────────

async function authFetch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${ENV.API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message ?? `Request failed (${res.status})`);
  }
  return json.data as T;
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
): Promise<AuthResult> {
  const result = await authFetch<AuthResult>('/api/auth/register', { name, email, password });
  tokenStorage.set(result.token);
  userStorage.set(result.user);
  return result;
}

export async function loginUser(
  email: string,
  password: string,
): Promise<AuthResult> {
  const result = await authFetch<AuthResult>('/api/auth/login', { email, password });
  tokenStorage.set(result.token);
  userStorage.set(result.user);
  return result;
}

export function logoutUser(): void {
  tokenStorage.clear();
}

export function getStoredUser(): AuthUser | null {
  return userStorage.get();
}
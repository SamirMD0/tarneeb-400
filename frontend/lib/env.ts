// lib/env.ts
// Lazy env var access — never throws during SSR or Turbopack cold builds.

function getEnv(key: string, fallback = ''): string {
  return process.env[key] || fallback;
}

export const ENV = {
  get SOCKET_URL() {
    return getEnv('NEXT_PUBLIC_SOCKET_URL', 'http://localhost:3001');
  },
  get API_BASE_URL() {
    return getEnv('NEXT_PUBLIC_API_BASE_URL', 'http://localhost:3001');
  },
  get APP_ENV() {
    return getEnv('NEXT_PUBLIC_APP_ENV', 'development');
  },
} as const;
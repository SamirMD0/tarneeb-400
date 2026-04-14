// lib/env.ts
// Lazy env var access — never throws during SSR or Turbopack cold builds.



export const ENV = {
  get SOCKET_URL() {
    return process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
  },
  get API_BASE_URL() {
    return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
  },
  get APP_ENV() {
    return process.env.NEXT_PUBLIC_APP_ENV || 'development';
  },
} as const;
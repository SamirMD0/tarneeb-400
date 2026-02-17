function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const ENV = {
  SOCKET_URL: requireEnv('NEXT_PUBLIC_SOCKET_URL'),
  API_BASE_URL: requireEnv('NEXT_PUBLIC_API_BASE_URL'),
} as const;
// Backend/src/types/auth.types.ts
// Auth request/response contracts for register and login endpoints.

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}
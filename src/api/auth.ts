import { api } from './client';

export type RegisterRequest = {
  email: string;
  password: string;
  confirmPassword: string;
  username: string;
  inviteCode?: string;
};

export type RegisterResponse = {
  id: string;
  email: string;
  username: string;
};

export function register(payload: RegisterRequest): Promise<RegisterResponse> {
  return api<RegisterResponse>('/auth/register', {
    method: 'POST',
    json: payload,
  });
}

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  id: string;
  email: string;
  username: string;
};

export function login(payload: LoginRequest): Promise<LoginResponse> {
  return api<LoginResponse>('/auth/login', {
    method: 'POST',
    json: payload,
  });
}

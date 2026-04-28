import client from './client';
import type { AuthResponseDto, UserDto } from '../types';

export const login = (email: string, password: string) =>
  client.post<AuthResponseDto>('/auth/login', { email, password }).then((r) => r.data);

export const register = (email: string, password: string, firstName?: string) =>
  client.post<AuthResponseDto>('/auth/register', { email, password, firstName }).then((r) => r.data);

export const fetchMe = () =>
  client.get<UserDto>('/users/me').then((r) => r.data);

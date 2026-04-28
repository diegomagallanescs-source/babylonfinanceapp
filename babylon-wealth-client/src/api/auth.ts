import client from './client';
import type { UserDto } from '../types';

export const login = (email: string, password: string) =>
  client.post<{ token: string; user: UserDto }>('/auth/login', { email, password }).then((r) => r.data);

export const register = (email: string, password: string, displayName?: string) =>
  client.post<{ token: string; user: UserDto }>('/auth/register', { email, password, displayName }).then((r) => r.data);

export const fetchMe = () =>
  client.get<UserDto>('/users/me').then((r) => r.data);

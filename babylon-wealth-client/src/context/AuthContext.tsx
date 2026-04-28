import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { fetchMe } from '../api/auth';
import type { AuthResponseDto, UserDto } from '../types';

interface AuthState {
  user: UserDto | null;
  token: string | null;
  isLoading: boolean;
  login: (authResponse: AuthResponseDto) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('babylon_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) { setIsLoading(false); return; }
    fetchMe()
      .then(setUser)
      .catch(() => { localStorage.removeItem('babylon_token'); setToken(null); })
      .finally(() => setIsLoading(false));
  }, [token]);

  const login = (authResponse: AuthResponseDto) => {
    localStorage.setItem('babylon_token', authResponse.token);
    setToken(authResponse.token);
    // Optimistically populate user from the auth response so we don't need
    // an extra /users/me round-trip right after login.
    setUser({
      id: authResponse.userId,
      email: authResponse.email,
      firstName: authResponse.firstName,
      createdAt: new Date().toISOString(),
    });
  };

  const logout = () => {
    localStorage.removeItem('babylon_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

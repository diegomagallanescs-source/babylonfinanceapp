import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchMe } from '../api/auth';
import type { UserDto } from '../types';

interface AuthState {
  user: UserDto | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: UserDto) => void;
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

  const login = (newToken: string, newUser: UserDto) => {
    localStorage.setItem('babylon_token', newToken);
    setToken(newToken);
    setUser(newUser);
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

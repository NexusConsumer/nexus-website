import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { api, setAccessToken, refreshAccessToken } from '../lib/api';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: 'USER' | 'ADMIN' | 'AGENT';
  avatarUrl?: string;
}

interface RegisterData {
  email: string;
  fullName: string;
  password: string;
  country?: string;
  emailUpdates?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  googleLogin: (accessToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    refreshAccessToken()
      .then((result) => {
        if (result && result.user) setUser(result.user as AuthUser);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    const data = await api.post<{ accessToken: string }>('/api/auth/login', {
      email,
      password,
      rememberMe,
    });
    setAccessToken(data.accessToken);
    const profile = await api.get<AuthUser>('/api/auth/me');
    setUser(profile);
  }, []);

  const register = useCallback(async (registerData: RegisterData) => {
    const data = await api.post<{ accessToken: string }>('/api/auth/register', registerData);
    setAccessToken(data.accessToken);
    const profile = await api.get<AuthUser>('/api/auth/me');
    setUser(profile);
  }, []);

  const googleLogin = useCallback(async (accessToken: string) => {
    const data = await api.post<{ accessToken: string }>('/api/auth/google', { accessToken });
    setAccessToken(data.accessToken);
    const profile = await api.get<AuthUser>('/api/auth/me');
    setUser(profile);
  }, []);

  const logout = useCallback(async () => {
    await api.post('/api/auth/logout').catch(() => {});
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, googleLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
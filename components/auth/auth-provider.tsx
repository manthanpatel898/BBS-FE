'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { clearSession, readSession, saveSession } from '@/lib/auth/storage';
import { AuthSession, AuthUser } from '@/lib/auth/types';

interface AuthContextValue {
  isReady: boolean;
  accessToken: string | null;
  user: AuthUser | null;
  setSession: (session: AuthSession) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [session, setSessionState] = useState<AuthSession | null>(null);

  useEffect(() => {
    const storedSession = readSession();
    setSessionState(storedSession);
    setIsReady(true);
  }, []);

  const setSession = (nextSession: AuthSession) => {
    saveSession(nextSession);
    setSessionState(nextSession);
  };

  const logout = () => {
    clearSession();
    setSessionState(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isReady,
        accessToken: session?.accessToken ?? null,
        user: session?.user ?? null,
        setSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

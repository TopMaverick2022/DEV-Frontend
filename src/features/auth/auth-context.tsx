import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from './auth-service';
import { tokenStore } from '@/lib/api-client';

interface User {
  username: string;
  email?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: { username: string; accessToken: string; refreshToken?: string }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = () => {
      const token = localStorage.getItem('accessToken');
      const username = localStorage.getItem('username');
      
      if (token && username) {
        // Sync in-memory token store so the interceptor doesn't treat it as missing
        tokenStore.set(token);
        setUser({ username });
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback((userData: { username: string; accessToken: string; refreshToken?: string }) => {
    localStorage.setItem('accessToken', userData.accessToken);
    if (userData.refreshToken) {
      localStorage.setItem('refreshToken', userData.refreshToken);
    }
    localStorage.setItem('username', userData.username);
    setUser({ username: userData.username });
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    localStorage.removeItem('username');
    localStorage.removeItem('accessToken'); // clear stale token to stop refresh loops
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isLoading, 
      login, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

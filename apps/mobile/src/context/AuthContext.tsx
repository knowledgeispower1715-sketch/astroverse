/**
 * AstroVerse Mobile OS - Authentication Context
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserSession } from '../types';
import { authApi } from '../api/auth';
import { apiClient } from '../api/client';
import { Storage } from '../utils/storage';

interface AuthContextType {
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  sendOtp: (phone: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  verifyOtp: (phone: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  register: (phone?: string, email?: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => ({ success: false }),
  sendOtp: async () => ({ success: false }),
  verifyOtp: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: async () => {},
  refreshMe: async () => {}
});

const TOKEN_KEY = 'astroverse_auth_token';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const storedToken = await Storage.getItem(TOKEN_KEY);
        if (storedToken) {
          apiClient.setToken(storedToken);
          const meRes = await authApi.getMe();
          if (meRes.success && meRes.user) {
            setUser(meRes.user);
          } else {
            await Storage.removeItem(TOKEN_KEY);
            apiClient.setToken(null);
          }
        }
      } catch {
        // Safe bootstrap failure
      } finally {
        setIsLoading(false);
      }
    };
    bootstrap();
  }, []);

  const login = async (identifier: string, password?: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(identifier, password);
      if (res.success && res.token && res.user) {
        await Storage.setItem(TOKEN_KEY, res.token);
        setUser({
          ...res.user,
          token: res.token
        });
        return { success: true };
      }
      return { success: false, error: res.error || 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtp = async (phone: string) => {
    return await authApi.sendOtp(phone);
  };

  const verifyOtp = async (phone: string, otp: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.verifyOtp(phone, otp);
      if (res.success && res.token && res.user) {
        await Storage.setItem(TOKEN_KEY, res.token);
        setUser({
          ...res.user,
          token: res.token
        });
        return { success: true };
      }
      return { success: false, error: res.error || 'Verification failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (phone?: string, email?: string, password?: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.register(phone, email, password);
      if (res.success && res.token && res.user) {
        await Storage.setItem(TOKEN_KEY, res.token);
        setUser({
          ...res.user,
          token: res.token
        });
        return { success: true };
      }
      return { success: false, error: res.error || 'Registration failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await Storage.removeItem(TOKEN_KEY);
    apiClient.setToken(null);
    setUser(null);
  };

  const refreshMe = async () => {
    if (!apiClient.getToken()) return;
    const res = await authApi.getMe();
    if (res.success && res.user) {
      setUser(res.user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        sendOtp,
        verifyOtp,
        register,
        logout,
        refreshMe
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

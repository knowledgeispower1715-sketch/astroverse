/**
 * AstroVerse Mobile OS - Authentication & Profile API
 */

import { apiClient } from './client';
import { UserSession, BirthProfile } from '../types';

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email?: string;
    phone?: string;
    role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
    walletBalance: number;
  };
  error?: string;
}

export const authApi = {
  async register(phone?: string, email?: string, password?: string): Promise<AuthResponse> {
    const res = await apiClient.post<any>('/api/auth/register', { phone, email, password });
    if (res.data?.success && res.data?.token) {
      apiClient.setToken(res.data.token);
      return {
        success: true,
        token: res.data.token,
        user: res.data.user
      };
    }
    return { success: false, error: res.error || res.data?.error || 'Registration failed' };
  },

  async login(identifier: string, password?: string): Promise<AuthResponse> {
    const res = await apiClient.post<any>('/api/auth/login', { identifier, password });
    if (res.data?.success && res.data?.token) {
      apiClient.setToken(res.data.token);
      return {
        success: true,
        token: res.data.token,
        user: res.data.user
      };
    }
    return { success: false, error: res.error || res.data?.error || 'Login failed' };
  },

  async sendOtp(phone: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const res = await apiClient.post<any>('/api/auth/otp/send', { phone });
    if (res.data?.success) {
      return { success: true, message: res.data.message };
    }
    return { success: false, error: res.error || res.data?.error || 'Failed to send OTP' };
  },

  async verifyOtp(phone: string, otp: string): Promise<AuthResponse> {
    const res = await apiClient.post<any>('/api/auth/otp/verify', { phone, otp });
    if (res.data?.success && res.data?.token) {
      apiClient.setToken(res.data.token);
      return {
        success: true,
        token: res.data.token,
        user: res.data.user
      };
    }
    return { success: false, error: res.error || res.data?.error || 'Invalid OTP' };
  },

  async getMe(): Promise<{ success: boolean; user?: UserSession; error?: string }> {
    const res = await apiClient.get<any>('/api/auth/me');
    if (res.data?.success && res.data?.user) {
      return {
        success: true,
        user: {
          id: res.data.user.id,
          email: res.data.user.email,
          phone: res.data.user.phone,
          role: res.data.user.role || 'USER',
          token: apiClient.getToken() || '',
          walletBalance: res.data.user.walletBalance || 0
        }
      };
    }
    return { success: false, error: res.error || 'Failed to fetch session' };
  },

  async getProfiles(): Promise<{ success: boolean; profiles?: BirthProfile[]; error?: string }> {
    const res = await apiClient.get<any>('/api/profiles');
    if (res.data?.success) {
      return { success: true, profiles: res.data.profiles || [] };
    }
    return { success: false, error: res.error || 'Failed to fetch profiles' };
  },

  async saveProfile(profile: Omit<BirthProfile, 'id'>): Promise<{ success: boolean; profile?: BirthProfile; error?: string }> {
    const res = await apiClient.post<any>('/api/profiles', profile);
    if (res.data?.success) {
      return { success: true, profile: res.data.profile };
    }
    return { success: false, error: res.error || 'Failed to save profile' };
  }
};

import { api } from './client';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    role: number; // 0=User, 1=Staff, 2=Admin
  };
}

export interface RegisterResponse {
  id: string;
  email: string;
  displayName: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/api/v1/auth/login', { email, password }),

  register: (displayName: string, email: string, password: string) =>
    api.post<RegisterResponse>('/api/v1/auth/register', { displayName, email, password }),

  getProfile: () => api.get('/api/v1/users/me/profile'),

  updateProfile: (data: { displayName: string; accessibilityMode: number; language: string; notificationsEnabled: boolean }) =>
    api.put('/api/v1/users/me/profile', data),

  deleteAccount: () => api.delete('/api/v1/users/me'),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/api/v1/auth/change-password', { currentPassword, newPassword }),
};

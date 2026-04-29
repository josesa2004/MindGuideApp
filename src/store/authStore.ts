import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '../api/auth';

interface AuthState {
  accessToken: string | null;
  userId: string | null;
  displayName: string | null;
  email: string | null;
  role: string | null;
  accessibilityMode: number;
  language: string;
  notificationsEnabled: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (displayName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateLocalProfile: (data: Partial<Pick<AuthState, 'displayName' | 'accessibilityMode' | 'language' | 'notificationsEnabled'>>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  userId: null,
  displayName: null,
  email: null,
  role: null,
  accessibilityMode: 0,
  language: 'pt',
  notificationsEnabled: true,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const { data } = await authApi.login(email, password);
    await SecureStore.setItemAsync('access_token', data.accessToken);
    await SecureStore.setItemAsync('refresh_token', data.refreshToken);
    set({
      accessToken: data.accessToken,
      userId: data.userId,
      displayName: data.displayName,
      email: data.email,
      role: data.role,
      isAuthenticated: true,
    });
    // Load profile details (accessibility mode, language)
    try { await get().refreshProfile(); } catch {}
  },

  register: async (displayName, email, password) => {
    await authApi.register(displayName, email, password);
    await get().login(email, password);
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    set({ accessToken: null, userId: null, displayName: null, email: null,
          role: null, isAuthenticated: false });
  },

  loadFromStorage: async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      if (token) {
        set({ accessToken: token, isAuthenticated: true, isLoading: false });
        try { await get().refreshProfile(); } catch {}
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  refreshProfile: async () => {
    const { data } = await authApi.getProfile();
    set({
      userId: data.id,
      displayName: data.displayName,
      email: data.email,
      accessibilityMode: data.accessibilityMode ?? 0,
      language: data.language ?? 'pt',
      notificationsEnabled: data.notificationsEnabled ?? true,
    });
  },

  updateLocalProfile: (data) => set((state) => ({ ...state, ...data })),
}));

import { create } from 'zustand';

export interface MobileUserProfile {
  id: string;
  email: string;
  fullName: string;
  currencyPreference: string;
  hasBiometrics: boolean;
}

interface AuthState {
  user: MobileUserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  biometricsEnabled: boolean;
  isLoading: boolean;
  error: string | null;

  setAuth: (user: MobileUserProfile, accessToken: string, refreshToken: string) => void;
  setBiometricsEnabled: (enabled: boolean) => void;
  updateUser: (updates: Partial<MobileUserProfile>) => void;
  logout: () => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  biometricsEnabled: true,
  isLoading: false,
  error: null,

  setAuth: (user, accessToken, refreshToken) =>
    set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
      error: null
    }),

  setBiometricsEnabled: (enabled) => set({ biometricsEnabled: enabled }),

  updateUser: (updates) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null
    })),

  logout: () =>
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      error: null
    }),

  setError: (error) => set({ error })
}));

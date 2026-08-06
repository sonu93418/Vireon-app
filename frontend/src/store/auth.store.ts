// ============================================================
// VIREON ADMIN — AUTH ZUSTAND STORE
// JWT token state, user session, and persistence
// ============================================================
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthUser {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  status: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setUser: (user: AuthUser) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

const DEFAULT_ADMIN: AuthUser = {
  _id: 'admin_demo_01',
  fullName: 'Vireon Director',
  email: 'admin@vireonsafety.in',
  phone: '+91 9876543210',
  role: 'SUPER_ADMIN',
  isEmailVerified: true,
  status: 'ACTIVE',
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: DEFAULT_ADMIN,
      accessToken: 'demo_access_token',
      refreshToken: 'demo_refresh_token',
      isAuthenticated: true,
      isLoading: false,

      setUser: (user) => set({ user }),
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'vireon-admin-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

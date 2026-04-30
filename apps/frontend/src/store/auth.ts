import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, AuthTokens } from "@/types/auth";

type AuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: number | null;
  isAuthenticated: boolean;
};

type AuthActions = {
  setAuth: (user: User, tokens: AuthTokens) => void;
  setTokens: (tokens: AuthTokens) => void;
  clearAuth: () => void;
};

export type AuthStore = AuthState & AuthActions;

export const useAuth = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      isAuthenticated: false,

      setAuth: (user, tokens) =>
        set({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: Date.now() + tokens.expiresIn * 1000,
          isAuthenticated: true,
        }),

      setTokens: (tokens) =>
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: Date.now() + tokens.expiresIn * 1000,
          isAuthenticated: true,
        }),

      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        refreshToken: state.refreshToken,
        user: state.user,
        tokenExpiresAt: state.tokenExpiresAt,
      }),
    },
  ),
);

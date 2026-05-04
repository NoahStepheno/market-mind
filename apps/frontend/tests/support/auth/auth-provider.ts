import type { APIRequestContext } from "@playwright/test";
import type { AuthProvider, AuthOptions } from "@seontechnologies/playwright-utils/auth-session";

const API_URL = process.env.API_URL || "http://localhost:3000";

export const authProvider: AuthProvider = {
  getEnvironment(options?: Partial<AuthOptions>): string {
    return options?.environment || process.env.TEST_ENV || "local";
  },

  getUserIdentifier(options?: Partial<AuthOptions>): string {
    return options?.userIdentifier || process.env.TEST_USER_EMAIL || "default";
  },

  extractToken(tokenData: Record<string, unknown>): string | null {
    const origins = tokenData.origins as
      | Array<{ localStorage: Array<{ name: string; value: string }> }>
      | undefined;
    const tokenEntry = origins?.[0]?.localStorage?.find((item) => item.name === "auth_token");
    return tokenEntry?.value ?? null;
  },

  extractCookies(
    tokenData: Record<string, unknown>,
  ): Array<{ name: string; value: string; domain?: string; path?: string }> {
    const cookies = tokenData.cookies as
      | Array<{ name: string; value: string; domain?: string; path?: string }>
      | undefined;
    return cookies ?? [];
  },

  isTokenExpired(rawToken: string): boolean {
    try {
      const payload = JSON.parse(atob(rawToken.split(".")[1]));
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  },

  async manageAuthToken(
    request: APIRequestContext,
    options?: Partial<AuthOptions>,
  ): Promise<Record<string, unknown>> {
    const email = options?.userIdentifier || process.env.TEST_USER_EMAIL;
    const password = options?.userPassword || process.env.TEST_USER_PASSWORD;

    if (!email || !password) {
      throw new Error("TEST_USER_EMAIL and TEST_USER_PASSWORD must be set");
    }

    const response = await request.post(`${API_URL}/api/auth/login`, {
      data: { email, password },
    });

    if (!response.ok()) {
      throw new Error(`Auth failed: ${response.status()}`);
    }

    const { token } = await response.json();

    return {
      cookies: [],
      origins: [
        {
          origin: API_URL,
          localStorage: [{ name: "auth_token", value: token }],
        },
      ],
    };
  },

  clearToken(): void {
    // Token is stored on disk by auth-session, clearing happens via file deletion
  },
};

import { describe, expect, test, vi } from "vite-plus/test";

import { Hono } from "hono";

import { appErrorHandler } from "../../common/errors/error-handler.ts";

const mockRevokeRefreshToken = vi.fn<() => Promise<boolean>>();

vi.mock("./service.ts", () => ({
  revokeRefreshToken: (...args: unknown[]) => mockRevokeRefreshToken(...(args as [])),
  rotateRefreshToken: vi.fn(),
  issueTokenPair: vi.fn(),
  upsertUserFromGoogle: vi.fn(),
  upsertUserFromWechat: vi.fn(),
}));

vi.mock("./config.ts", () => ({
  getGoogleCallbackUrl: vi.fn(() => "http://localhost:3000/api/v1/auth/google/callback"),
  getWechatMpCallbackUrl: vi.fn(() => "http://localhost:3000/api/v1/auth/wechat/mp/callback"),
}));

vi.mock("./token.ts", () => ({
  signOAuthState: vi.fn(() => Promise.resolve("mock-state")),
  verifyOAuthState: vi.fn(() => Promise.resolve()),
}));

import { authRoutes } from "./routes.ts";

function createTestApp() {
  const app = new Hono();
  app.onError(appErrorHandler);
  app.route("/api/v1/auth", authRoutes);
  return app;
}

describe("POST /auth/logout", () => {
  test("returns { success: true } when token is revoked", async () => {
    mockRevokeRefreshToken.mockResolvedValueOnce(true);
    const app = createTestApp();

    const res = await app.request("/api/v1/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: "valid-token" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true });
  });

  test("returns { success: false } when token is already revoked or invalid", async () => {
    mockRevokeRefreshToken.mockResolvedValueOnce(false);
    const app = createTestApp();

    const res = await app.request("/api/v1/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: "invalid-token" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: false });
  });

  test("returns 400 for missing refreshToken", async () => {
    const app = createTestApp();

    const res = await app.request("/api/v1/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
  });
});

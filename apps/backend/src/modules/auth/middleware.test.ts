import { describe, expect, test, beforeAll } from "vite-plus/test";

import { Hono } from "hono";

import { requireAuth } from "./middleware.ts";
import type { AuthVariables } from "./middleware.ts";
import { signAccessToken } from "./token.ts";

function createTestApp() {
  const app = new Hono<AuthVariables>();
  app.use("/protected", requireAuth);
  app.get("/protected", (c) => {
    const user = c.get("authUser");
    return c.json({ userId: user.id });
  });
  return app;
}

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-key-for-unit-tests-at-least-32-chars";
  process.env.JWT_ISSUER = "market-test";
  process.env.JWT_AUDIENCE = "market-test-users";
  process.env.ACCESS_TOKEN_TTL_SECONDS = "900";
});

describe("requireAuth middleware", () => {
  test("allows valid token and sets authUser", async () => {
    const app = createTestApp();
    const token = await signAccessToken({
      sub: "user-123",
      email: "test@example.com",
      name: "Test User",
      avatarUrl: null,
    });

    const res = await app.request("/protected", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.userId).toBe("user-123");
  });

  test("returns 401 for missing Authorization header", async () => {
    const app = createTestApp();
    const res = await app.request("/protected");
    expect(res.status).toBe(401);
  });

  test("returns 401 for malformed token", async () => {
    const app = createTestApp();
    const res = await app.request("/protected", {
      headers: { Authorization: "Bearer not-a-real-token" },
    });
    expect(res.status).toBe(401);
  });

  test("returns 401 for expired token", async () => {
    process.env.ACCESS_TOKEN_TTL_SECONDS = "0";
    const token = await signAccessToken({
      sub: "u1",
      email: "a@b.c",
      name: "X",
      avatarUrl: null,
    });
    process.env.ACCESS_TOKEN_TTL_SECONDS = "900";

    const app = createTestApp();
    const res = await app.request("/protected", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(401);
  });

  test("returns 401 when scheme is not Bearer", async () => {
    const token = await signAccessToken({
      sub: "u1",
      email: "a@b.c",
      name: "X",
      avatarUrl: null,
    });

    const app = createTestApp();
    const res = await app.request("/protected", {
      headers: { Authorization: `Basic ${token}` },
    });
    expect(res.status).toBe(401);
  });

  test("returns 401 for empty Bearer token", async () => {
    const app = createTestApp();
    const res = await app.request("/protected", {
      headers: { Authorization: "Bearer " },
    });
    expect(res.status).toBe(401);
  });
});

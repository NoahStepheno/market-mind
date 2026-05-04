import { describe, expect, test, beforeAll, vi, afterEach } from "vite-plus/test";

import { verifyAccessToken } from "./token.ts";
import {
  generateRefreshToken,
  getRefreshTokenTtlSeconds,
  hashToken,
  signAccessToken,
  signOAuthState,
  verifyOAuthState,
} from "./token.ts";

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-key-for-unit-tests-at-least-32-chars";
  process.env.JWT_ISSUER = "market-test";
  process.env.JWT_AUDIENCE = "market-test-users";
  process.env.ACCESS_TOKEN_TTL_SECONDS = "900";
  process.env.REFRESH_TOKEN_TTL_SECONDS = "1209600";
});

describe("signAccessToken / verifyAccessToken", () => {
  test("round-trips a valid token", async () => {
    const payload = {
      sub: "user-123",
      email: "test@example.com",
      name: "Test User",
      avatarUrl: "https://img.example.com/avatar.png",
    };
    const token = await signAccessToken(payload);
    const verified = await verifyAccessToken(token);

    expect(verified.sub).toBe(payload.sub);
    expect(verified.email).toBe(payload.email);
    expect(verified.name).toBe(payload.name);
    expect(verified.avatarUrl).toBe(payload.avatarUrl);
  });

  test("handles null avatarUrl", async () => {
    const payload = {
      sub: "user-456",
      email: "noavatar@example.com",
      name: "No Avatar",
      avatarUrl: null,
    };
    const token = await signAccessToken(payload);
    const verified = await verifyAccessToken(token);
    expect(verified.avatarUrl).toBeNull();
  });

  test("rejects expired token", async () => {
    process.env.ACCESS_TOKEN_TTL_SECONDS = "0";
    const token = await signAccessToken({
      sub: "u1",
      email: "a@b.c",
      name: "X",
      avatarUrl: null,
    });
    process.env.ACCESS_TOKEN_TTL_SECONDS = "900";

    await expect(verifyAccessToken(token)).rejects.toThrow();
  });

  test("rejects token signed with wrong secret", async () => {
    const token = await signAccessToken({
      sub: "u1",
      email: "a@b.c",
      name: "X",
      avatarUrl: null,
    });
    process.env.JWT_SECRET = "wrong-secret-key-for-test-at-least-32-chars";
    await expect(verifyAccessToken(token)).rejects.toThrow();
    process.env.JWT_SECRET = "test-secret-key-for-unit-tests-at-least-32-chars";
  });

  test("rejects token with wrong issuer", async () => {
    process.env.JWT_ISSUER = "wrong-issuer";
    const token = await signAccessToken({
      sub: "u1",
      email: "a@b.c",
      name: "X",
      avatarUrl: null,
    });
    process.env.JWT_ISSUER = "market-test";
    await expect(verifyAccessToken(token)).rejects.toThrow();
  });
});

describe("generateRefreshToken", () => {
  test("produces unique tokens", () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(0);
  });
});

describe("hashToken", () => {
  test("is deterministic", () => {
    const raw = "some-token-value";
    expect(hashToken(raw)).toBe(hashToken(raw));
  });

  test("different inputs produce different hashes", () => {
    expect(hashToken("a")).not.toBe(hashToken("b"));
  });
});

describe("signOAuthState / verifyOAuthState", () => {
  test("round-trips a valid state", async () => {
    const state = await signOAuthState();
    await expect(verifyOAuthState(state)).resolves.toBeUndefined();
  });

  test("rejects tampered state", async () => {
    const state = await signOAuthState();
    await expect(verifyOAuthState(state + "tampered")).rejects.toThrow();
  });

  test("rejects expired state", async () => {
    vi.useFakeTimers();
    const state = await signOAuthState();
    vi.advanceTimersByTime(601_000);
    await expect(verifyOAuthState(state)).rejects.toThrow();
    vi.useRealTimers();
  });
});

describe("getRefreshTokenTtlSeconds", () => {
  test("returns default when env not set", () => {
    delete process.env.REFRESH_TOKEN_TTL_SECONDS;
    expect(getRefreshTokenTtlSeconds()).toBe(1_209_600);
    process.env.REFRESH_TOKEN_TTL_SECONDS = "1209600";
  });
});

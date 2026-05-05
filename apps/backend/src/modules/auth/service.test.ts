import { describe, expect, test, vi, beforeAll } from "vite-plus/test";

import { upsertUserFromGoogle, revokeRefreshToken } from "./service.ts";

const mockUser = {
  id: "user-uuid-1",
  email: "test@gmail.com",
  name: "Test User",
  avatarUrl: "https://img.example.com/pic.png",
  createdAt: new Date(),
  updatedAt: new Date(),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockTx: any;

vi.mock("../../common/db/client.ts", () => {
  return {
    db: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transaction: vi.fn((fn: (tx: any) => Promise<any>) => fn(mockTx)),
    },
  };
});

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-key-for-unit-tests-at-least-32-chars";
  process.env.JWT_ISSUER = "market-test";
  process.env.JWT_AUDIENCE = "market-test-users";
  process.env.ACCESS_TOKEN_TTL_SECONDS = "900";
  process.env.REFRESH_TOKEN_TTL_SECONDS = "1209600";
});

describe("upsertUserFromGoogle", () => {
  test("creates new user when email not found", async () => {
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]),
    };
    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([mockUser]),
    };

    mockTx = {
      select: vi.fn().mockReturnValue(selectChain),
      insert: vi.fn().mockReturnValue(insertChain),
      update: vi.fn(),
    };

    const user = await upsertUserFromGoogle({
      sub: "google-sub-1",
      email: "new@gmail.com",
      name: "New User",
      picture: "https://img.example.com/new.png",
    });

    expect(user).toEqual(mockUser);
    expect(mockTx.insert).toHaveBeenCalledTimes(2);
  });

  test("updates existing user and account", async () => {
    const existingUser = { ...mockUser, name: "Old Name" };
    const existingAccount = { id: "acc-1", userId: mockUser.id };

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValueOnce([existingUser]).mockResolvedValueOnce([existingAccount]),
    };
    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi
        .fn()
        .mockResolvedValueOnce([{ ...mockUser, name: "Test User" }])
        .mockResolvedValueOnce([{ id: "acc-1" }]),
    };

    mockTx = {
      select: vi.fn().mockReturnValue(selectChain),
      insert: vi.fn(),
      update: vi.fn().mockReturnValue(updateChain),
    };

    const user = await upsertUserFromGoogle({
      sub: "google-sub-1",
      email: "test@gmail.com",
      name: "Test User",
      picture: "https://img.example.com/new.png",
      googleAccessToken: "new-access-token",
    });

    expect(user).toEqual({ ...mockUser, name: "Test User" });
    expect(mockTx.update).toHaveBeenCalledTimes(2);
  });
});

describe("revokeRefreshToken", () => {
  test("returns true when token is revoked successfully", async () => {
    const storedToken = { id: "token-1", tokenHash: "some-hash", userId: "user-1" };
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([storedToken]),
    };
    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: "token-1" }]),
    };

    mockTx = {
      select: vi.fn().mockReturnValue(selectChain),
      update: vi.fn().mockReturnValue(updateChain),
    };

    const result = await revokeRefreshToken("valid-refresh-token");
    expect(result).toBe(true);
    expect(mockTx.select).toHaveBeenCalled();
    expect(mockTx.update).toHaveBeenCalled();
  });

  test("returns false for already-revoked token", async () => {
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    mockTx = {
      select: vi.fn().mockReturnValue(selectChain),
    };

    const result = await revokeRefreshToken("revoked-token");
    expect(result).toBe(false);
  });

  test("returns false for non-existent token", async () => {
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    mockTx = {
      select: vi.fn().mockReturnValue(selectChain),
    };

    const result = await revokeRefreshToken("non-existent-token");
    expect(result).toBe(false);
  });
});

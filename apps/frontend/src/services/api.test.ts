import { describe, expect, test, vi, beforeEach, afterEach } from "vite-plus/test";

import { apiFetch, ApiError } from "./api.ts";

const clearAuth = vi.fn();
const setTokens = vi.fn();
const mockState = {
  accessToken: "valid-access-token" as string | null,
  refreshToken: "valid-refresh-token" as string | null,
  tokenExpiresAt: (Date.now() + 300_000) as number | null,
  clearAuth,
  setTokens,
};

vi.mock("@/store/auth", () => ({
  useAuth: {
    getState: () => mockState,
  },
}));

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubEnv("VITE_API_URL", "http://localhost:3000");
  vi.stubGlobal("window", { location: { href: "" } });
  clearAuth.mockReset();
  setTokens.mockReset();

  Object.assign(mockState, {
    accessToken: "valid-access-token",
    refreshToken: "valid-refresh-token",
    tokenExpiresAt: Date.now() + 300_000,
  });

  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("apiFetch 401 handling", () => {
  test("retries with new token when refresh succeeds", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ code: "UNAUTHORIZED", message: "Token expired" }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          accessToken: "new-access-token",
          refreshToken: "new-refresh-token",
          expiresIn: 900,
        }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: "success" }),
    });

    const result = await apiFetch("/api/v1/test");
    expect(result).toEqual({ data: "success" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(setTokens).toHaveBeenCalledWith({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      expiresIn: 900,
    });
  });

  test("clears auth and redirects when refresh fails", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ code: "UNAUTHORIZED", message: "Token expired" }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ code: "UNAUTHORIZED", message: "Invalid refresh token" }),
    });

    await expect(apiFetch("/api/v1/test")).rejects.toThrow(ApiError);
    expect(clearAuth).toHaveBeenCalled();
    expect(window.location.href).toBe("/login");
  });

  test("throws error without retry when no refresh token", async () => {
    Object.assign(mockState, {
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
    });

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ code: "UNAUTHORIZED", message: "No auth" }),
    });

    await expect(apiFetch("/api/v1/test")).rejects.toThrow(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

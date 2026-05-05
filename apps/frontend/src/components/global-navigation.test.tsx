import { describe, expect, test, vi, afterEach } from "vite-plus/test";
import { renderToString } from "react-dom/server";
import * as React from "react";
import { MemoryRouter } from "react-router-dom";
import { GlobalNavigation } from "./global-navigation";

type AuthState = {
  user: { name: string; avatarUrl: string | null } | null;
  refreshToken: string | null;
  clearAuth: () => void;
};

let mockAuthState: AuthState = {
  user: null,
  refreshToken: null,
  clearAuth: vi.fn(),
};

vi.mock("@/store/auth", () => ({
  useAuth: (selector: (s: AuthState) => unknown) => selector(mockAuthState),
}));

vi.mock("@/services/api", () => ({
  logout: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useLocation: () => ({ pathname: "/chat" }),
  };
});

describe("GlobalNavigation", () => {
  afterEach(() => {
    mockAuthState = { user: null, refreshToken: null, clearAuth: vi.fn() };
  });

  test("renders all nav items", () => {
    mockAuthState = {
      user: { name: "Test", avatarUrl: null },
      refreshToken: "token",
      clearAuth: vi.fn(),
    };

    const html = renderToString(
      <MemoryRouter initialEntries={["/chat"]}>
        <GlobalNavigation />
      </MemoryRouter>,
    );

    expect(html).toContain("聊天");
    expect(html).toContain("闹钟");
    expect(html).toContain("设置");
  });

  test("renders logout button", () => {
    mockAuthState = {
      user: { name: "Test", avatarUrl: null },
      refreshToken: "token",
      clearAuth: vi.fn(),
    };

    const html = renderToString(
      <MemoryRouter initialEntries={["/chat"]}>
        <GlobalNavigation />
      </MemoryRouter>,
    );

    expect(html).toContain("退出登录");
  });

  test("renders avatar when available", () => {
    mockAuthState = {
      user: { name: "Test", avatarUrl: "https://example.com/avatar.png" },
      refreshToken: "token",
      clearAuth: vi.fn(),
    };

    const html = renderToString(
      <MemoryRouter initialEntries={["/chat"]}>
        <GlobalNavigation />
      </MemoryRouter>,
    );

    expect(html).toContain("https://example.com/avatar.png");
    expect(html).toContain('alt="Test"');
  });

  test("renders desktop header with correct classes", () => {
    mockAuthState = {
      user: { name: "Test", avatarUrl: null },
      refreshToken: "token",
      clearAuth: vi.fn(),
    };

    const html = renderToString(
      <MemoryRouter initialEntries={["/chat"]}>
        <GlobalNavigation />
      </MemoryRouter>,
    );

    expect(html).toContain("bg-apple-surface-black");
    expect(html).toContain("h-11");
    expect(html).toContain("sticky");
  });

  test("renders mobile bottom nav with fixed positioning", () => {
    mockAuthState = {
      user: { name: "Test", avatarUrl: null },
      refreshToken: "token",
      clearAuth: vi.fn(),
    };

    const html = renderToString(
      <MemoryRouter initialEntries={["/chat"]}>
        <GlobalNavigation />
      </MemoryRouter>,
    );

    expect(html).toContain("fixed");
    expect(html).toContain("bottom-0");
  });

  test("renders market wordmark", () => {
    mockAuthState = {
      user: { name: "Test", avatarUrl: null },
      refreshToken: "token",
      clearAuth: vi.fn(),
    };

    const html = renderToString(
      <MemoryRouter initialEntries={["/chat"]}>
        <GlobalNavigation />
      </MemoryRouter>,
    );

    expect(html).toContain(">market<");
  });
});

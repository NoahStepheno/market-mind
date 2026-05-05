import { describe, expect, test, vi, afterEach } from "vite-plus/test";
import { renderToString } from "react-dom/server";
import * as React from "react";
import { MemoryRouter } from "react-router-dom";
import { AppLayout } from "./app-layout";

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

describe("AppLayout", () => {
  afterEach(() => {
    mockAuthState = { user: null, refreshToken: null, clearAuth: vi.fn() };
  });

  test("renders children inside the layout", () => {
    mockAuthState = {
      user: { name: "Test", avatarUrl: null },
      refreshToken: "token",
      clearAuth: vi.fn(),
    };

    const html = renderToString(
      <MemoryRouter initialEntries={["/chat"]}>
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      </MemoryRouter>,
    );

    expect(html).toContain("Test Content");
  });

  test("renders GlobalNavigation with nav items", () => {
    mockAuthState = {
      user: { name: "Test", avatarUrl: null },
      refreshToken: "token",
      clearAuth: vi.fn(),
    };

    const html = renderToString(
      <MemoryRouter initialEntries={["/chat"]}>
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      </MemoryRouter>,
    );

    expect(html).toContain("聊天");
    expect(html).toContain("闹钟");
    expect(html).toContain("设置");
  });

  test("applies parchment background and apple text font", () => {
    mockAuthState = {
      user: { name: "Test", avatarUrl: null },
      refreshToken: "token",
      clearAuth: vi.fn(),
    };

    const html = renderToString(
      <MemoryRouter initialEntries={["/chat"]}>
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      </MemoryRouter>,
    );

    expect(html).toContain("bg-apple-parchment");
    expect(html).toContain("font-apple-text");
  });

  test("applies padding for navigation bars", () => {
    mockAuthState = {
      user: { name: "Test", avatarUrl: null },
      refreshToken: "token",
      clearAuth: vi.fn(),
    };

    const html = renderToString(
      <MemoryRouter initialEntries={["/chat"]}>
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      </MemoryRouter>,
    );

    expect(html).toContain("pt-11");
    expect(html).toContain("max-md:pb-11");
  });
});

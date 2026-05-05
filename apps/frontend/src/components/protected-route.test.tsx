import { describe, expect, test, vi, afterEach } from "vite-plus/test";
import { renderToString } from "react-dom/server";
import * as React from "react";

type AuthState = {
  user: { id: string; email: string; name: string; avatarUrl: string | null } | null;
  refreshToken: string | null;
};

let mockAuthState: AuthState = { user: null, refreshToken: null };

vi.mock("@/store/auth", () => ({
  useAuth: (selector: (s: AuthState) => unknown) => selector(mockAuthState),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useLocation: () => ({ pathname: "/protected" }),
    Navigate: (props: { to: string }) =>
      React.createElement("div", { "data-testid": "navigate", "data-to": props.to }),
  };
});

import { ProtectedRoute } from "./protected-route.tsx";

describe("ProtectedRoute", () => {
  afterEach(() => {
    mockAuthState = { user: null, refreshToken: null };
  });

  test("renders children when user and refreshToken are present", () => {
    mockAuthState = {
      user: { id: "1", email: "test@example.com", name: "Test", avatarUrl: null },
      refreshToken: "valid-token",
    };

    const html = renderToString(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
    );

    expect(html).toContain("Protected Content");
    expect(html).not.toContain('data-testid="navigate"');
  });

  test("renders Navigate to /login when user is null", () => {
    mockAuthState = { user: null, refreshToken: null };

    const html = renderToString(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
    );

    expect(html).not.toContain("Protected Content");
    expect(html).toContain('data-testid="navigate"');
    expect(html).toContain("/login");
  });

  test("renders Navigate to /login when refreshToken is null", () => {
    mockAuthState = {
      user: { id: "1", email: "t@t.com", name: "T", avatarUrl: null },
      refreshToken: null,
    };

    const html = renderToString(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
    );

    expect(html).not.toContain("Protected Content");
    expect(html).toContain('data-testid="navigate"');
    expect(html).toContain("/login");
  });
});

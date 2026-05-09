import { useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/store/auth";
import { logout as apiLogout } from "@/services/api";

const navItems = [
  { path: "/chat", label: "聊天", testId: "nav-home" },
  { path: "/alarms", label: "闹钟", testId: "nav-alarms" },
  { path: "/settings", label: "设置", testId: "nav-settings" },
] as const;

function isActive(locationPath: string, itemPath: string): boolean {
  if (locationPath === itemPath) return true;
  if (
    locationPath.startsWith(itemPath + "/") &&
    !navItems.some((n) => n.path !== itemPath && locationPath.startsWith(n.path))
  ) {
    return true;
  }
  return false;
}

export function GlobalNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const refreshToken = useAuth((s) => s.refreshToken);
  const clearAuth = useAuth((s) => s.clearAuth);
  const isLoggingOut = useRef(false);

  const handleLogout = async () => {
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;
    try {
      if (refreshToken) {
        await apiLogout(refreshToken).catch(() => {});
      }
      clearAuth();
      void navigate("/login", { replace: true });
    } finally {
      isLoggingOut.current = false;
    }
  };

  return (
    <>
      {/* Desktop top bar (≥768px) */}
      <header
        data-testid="app-header"
        className="hidden md:flex sticky top-0 z-50 h-11 items-center bg-apple-surface-black px-apple-xl"
      >
        <div className="mx-auto flex w-full max-w-[980px] items-center justify-between">
          <Link
            to="/chat"
            data-testid="nav-home"
            className="font-apple-display text-tagline text-apple-on-dark"
          >
            market
          </Link>

          <nav className="flex items-center gap-apple-lg">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                data-testid={item.testId}
                aria-current={isActive(location.pathname, item.path) ? "page" : undefined}
                className={`text-fine-print transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-apple-primary ${
                  isActive(location.pathname, item.path)
                    ? "text-apple-on-dark"
                    : "text-apple-body-muted"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-apple-sm">
            {user?.avatarUrl && (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-8 w-8 rounded-full object-cover"
              />
            )}
            <button
              type="button"
              data-testid="logout-button"
              onClick={handleLogout}
              className="rounded-apple-sm bg-apple-ink px-[15px] py-2 text-button-utility text-apple-on-dark transition-transform duration-100 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-apple-primary"
            >
              退出登录
            </button>
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar (<768px) */}
      <nav
        data-testid="mobile-nav"
        className="flex md:hidden fixed bottom-0 inset-x-0 z-50 h-11 items-center justify-around bg-apple-surface-black"
      >
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            data-testid={`mobile-${item.testId}`}
            aria-current={isActive(location.pathname, item.path) ? "page" : undefined}
            className={`flex flex-col items-center text-fine-print transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-apple-primary ${
              isActive(location.pathname, item.path)
                ? "text-apple-on-dark"
                : "text-apple-body-muted"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}

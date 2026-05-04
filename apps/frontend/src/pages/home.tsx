import { useNavigate } from "react-router-dom";
import { useAuth } from "@/store/auth";
import { logout as apiLogout } from "@/services/api";

export function HomePage() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const refreshToken = useAuth((s) => s.refreshToken);
  const clearAuth = useAuth((s) => s.clearAuth);

  const handleLogout = async () => {
    if (refreshToken) {
      await apiLogout(refreshToken).catch(() => {});
    }
    clearAuth();
    await navigate("/login", { replace: true });
  };

  return (
    <main className="min-h-screen bg-apple-parchment font-apple-text">
      {/* Top bar */}
      <header className="flex items-center justify-between bg-apple-canvas px-apple-xl py-apple-sm">
        <span className="font-apple-display text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-apple-ink">
          market
        </span>
        <div className="flex items-center gap-apple-sm">
          {user?.avatarUrl && (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-8 w-8 rounded-full object-cover"
            />
          )}
          <span className="text-[14px] leading-[1.43] tracking-[-0.224px] text-apple-ink">
            {user?.name}
          </span>
          <button
            onClick={handleLogout}
            className="rounded-apple-sm bg-apple-ink px-[15px] py-2 text-[14px] font-normal leading-[1.29] tracking-[-0.224px] text-apple-on-dark transition-transform duration-100 active:scale-95"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex min-h-[calc(100vh-52px)] flex-col items-center justify-center">
        <h1 className="font-apple-display text-[40px] font-semibold leading-[1.1] tracking-[0px] text-apple-ink sm:text-[56px] sm:leading-[1.07] sm:tracking-[-0.28px]">
          Welcome{user?.name ? `, ${user.name}` : ""}
        </h1>
      </div>
    </main>
  );
}

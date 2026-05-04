import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/store/auth";
import { exchangeCode } from "@/services/api";

export function CallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuth = useAuth((s) => s.setAuth);
  const processed = useRef(false);

  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    if (error) return;
    if (!code) return;

    exchangeCode(code)
      .then((data) => {
        window.history.replaceState({}, "", "/auth/callback");
        setAuth(data.user, {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresIn: data.expiresIn,
        });
        const returnUrl = sessionStorage.getItem("returnUrl");
        sessionStorage.removeItem("returnUrl");
        void navigate(returnUrl || "/chat", { replace: true });
      })
      .catch(() => {
        window.history.replaceState({}, "", "/auth/callback");
      });
  }, [code, error, setAuth, navigate]);

  if (error) {
    return (
      <CallbackShell>
        <p className="text-[17px] leading-[1.47] tracking-[-0.374px] text-apple-ink">
          Sign in failed
        </p>
        <p className="text-[14px] leading-[1.43] tracking-[-0.224px] text-apple-ink-muted-48">
          {errorDescription || error}
        </p>
        <a
          href="/login"
          className="inline-flex items-center justify-center rounded-apple-pill border border-apple-primary px-[22px] py-[11px] text-[17px] font-normal tracking-[-0.374px] text-apple-primary transition-transform duration-100 active:scale-95"
        >
          Try Again
        </a>
      </CallbackShell>
    );
  }

  if (!code) {
    return (
      <CallbackShell>
        <p className="text-[17px] leading-[1.47] tracking-[-0.374px] text-apple-ink">
          Invalid callback
        </p>
        <a
          href="/login"
          className="inline-flex items-center justify-center rounded-apple-pill border border-apple-primary px-[22px] py-[11px] text-[17px] font-normal tracking-[-0.374px] text-apple-primary transition-transform duration-100 active:scale-95"
        >
          Back to Login
        </a>
      </CallbackShell>
    );
  }

  return (
    <CallbackShell>
      <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-apple-ink/20 border-t-apple-ink" />
      <p className="text-[17px] leading-[1.47] tracking-[-0.374px] text-apple-ink-muted-48">
        Completing sign in...
      </p>
    </CallbackShell>
  );
}

function CallbackShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-apple-md bg-apple-canvas px-apple-lg font-apple-text">
      {children}
    </main>
  );
}

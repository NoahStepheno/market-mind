import { useState } from "react";

type LoginButtonProps = {
  icon: React.ReactNode;
  label: string;
  href: string;
  className?: string;
};

export function LoginButton({ icon, label, href, className }: LoginButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    window.location.href = href;
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      data-testid="login-button"
      className={
        "flex w-full items-center justify-center gap-3 rounded-apple-pill " +
        "bg-apple-primary px-[22px] py-[11px] text-[17px] font-normal " +
        "tracking-[-0.374px] text-apple-on-primary " +
        "transition-transform duration-100 active:scale-95 " +
        "focus-visible:outline-2 focus-visible:outline-apple-primary-focus " +
        "disabled:pointer-events-none disabled:opacity-70 " +
        "font-apple-text min-h-[44px] " +
        (className ?? "")
      }
    >
      {loading ? (
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-apple-ink/30 border-t-apple-ink" />
      ) : (
        icon
      )}
      {label}
    </button>
  );
}

const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3000";

export function GoogleLoginButton() {
  return (
    <LoginButton
      icon={<GoogleIcon />}
      label="使用 Google 登录"
      href={`${apiBase}/api/v1/auth/google/start`}
    />
  );
}

export function WeChatLoginButton() {
  return (
    <LoginButton
      icon={<WeChatIcon />}
      label="微信登录"
      href={`${apiBase}/api/v1/auth/wechat/mp/start`}
    />
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function WeChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M13.8 8.2c-.11 0-.22.005-.33.013A5.46 5.46 0 0 0 3.6 6.8a4.2 4.2 0 0 0 .6 8.4h9.6a3.5 3.5 0 0 0 0-7Z"
        fill="#07C160"
      />
      <path
        d="M16.4 12.2a3.1 3.1 0 0 0-3.1-3.1 3.08 3.08 0 0 0-1.37.32 4.96 4.96 0 0 1 .07.78 4.96 4.96 0 0 1-4.4 4.93c.56.57 1.34.92 2.2.92h.1a2.4 2.4 0 0 0 1.5-.53l1.1.63-.3-1.1A3.1 3.1 0 0 0 16.4 12.2Z"
        fill="#07C160"
      />
      <circle cx="6" cy="8.5" r="0.8" fill="white" />
      <circle cx="10" cy="8.5" r="0.8" fill="white" />
      <circle cx="11.5" cy="11.5" r="0.5" fill="white" />
      <circle cx="14" cy="11.5" r="0.5" fill="white" />
    </svg>
  );
}

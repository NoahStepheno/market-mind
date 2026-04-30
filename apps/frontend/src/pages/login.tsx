import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { isWeChatBrowser } from "@/lib/wechat";
import { GoogleLoginButton, WeChatLoginButton } from "@/components/auth-button";

export function LoginPage() {
  const location = useLocation();
  const isWeChat = isWeChatBrowser();

  const returnUrl = (location.state as { from?: string })?.from || "/home";

  useEffect(() => {
    sessionStorage.setItem("returnUrl", returnUrl);
  }, [returnUrl]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-apple-parchment px-apple-lg font-apple-text">
      <div className="w-full max-w-[400px] space-y-apple-xxl">
        <div className="space-y-apple-sm text-center">
          <h1 className="font-apple-display text-[28px] font-semibold leading-[1.07] tracking-[-0.28px] text-apple-ink sm:text-[34px] sm:tracking-[-0.374px]">
            market
          </h1>
          <p className="text-[17px] leading-[1.47] tracking-[-0.374px] text-apple-ink-muted-48">
            Sign in to your account
          </p>
        </div>

        <div className="space-y-apple-md">
          {isWeChat ? <WeChatLoginButton /> : <GoogleLoginButton />}

          {!isWeChat && (
            <p className="text-center text-[12px] leading-[1.0] tracking-[-0.12px] text-apple-ink-muted-48">
              WeChat QR code login coming soon
            </p>
          )}
        </div>

        <p className="text-center text-[12px] leading-[1.0] tracking-[-0.12px] text-apple-ink-muted-48">
          By continuing, you agree to our{" "}
          <span className="text-apple-primary">Terms of Service</span> and{" "}
          <span className="text-apple-primary">Privacy Policy</span>
        </p>
      </div>
    </main>
  );
}

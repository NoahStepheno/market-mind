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
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0D1B2A] px-apple-lg font-apple-text">
      <div className="flex w-full max-w-[400px] flex-col items-center">
        <div className="flex flex-col items-center gap-apple-lg">
          <img src="/logo.svg" alt="Market" className="h-[96px] w-[96px]" />
          <div className="flex flex-col items-center gap-apple-xs">
            <h1 className="font-apple-display text-[34px] font-semibold leading-[1.07] tracking-[-0.374px] text-apple-body-on-dark">
              Market
            </h1>
            <p className="text-[17px] leading-[1.47] tracking-[-0.374px] text-apple-body-muted">
              一句话设置股票提醒
            </p>
          </div>
        </div>

        <div className="mt-apple-xxl w-full space-y-apple-md">
          {isWeChat ? <WeChatLoginButton /> : <GoogleLoginButton />}
          {!isWeChat && (
            <p className="text-center text-[12px] leading-[1.0] tracking-[-0.12px] text-apple-ink-muted-48">
              微信登录即将上线
            </p>
          )}
        </div>

        <p className="mt-apple-xxl text-center text-[12px] leading-[1.0] tracking-[-0.12px] text-apple-ink-muted-48">
          继续即表示你同意我们的
          <span className="text-apple-primary-on-dark"> 服务条款 </span>和
          <span className="text-apple-primary-on-dark"> 隐私政策 </span>
        </p>
      </div>
    </main>
  );
}

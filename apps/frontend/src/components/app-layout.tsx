import type { ReactNode } from "react";
import { GlobalNavigation } from "./global-navigation";

type Props = { children: ReactNode };

export function AppLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-apple-parchment font-apple-text">
      <GlobalNavigation />
      <main className="pt-11 max-md:pb-11">{children}</main>
    </div>
  );
}

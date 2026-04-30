import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/store/auth";
import type { ReactNode } from "react";

type Props = { children: ReactNode };

export function ProtectedRoute({ children }: Props) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

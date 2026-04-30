import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "@/pages/login";
import { CallbackPage } from "@/pages/callback";
import { ProtectedRoute } from "@/components/protected-route";

const HomePage = lazy(() => import("@/pages/home").then((m) => ({ default: m.HomePage })));

export default function App() {
  return (
    <Suspense>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<CallbackPage />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Suspense>
  );
}

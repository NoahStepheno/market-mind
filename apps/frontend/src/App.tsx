import { Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "@/pages/login";
import { CallbackPage } from "@/pages/callback";
import { HomePage } from "@/pages/home";
import { ProtectedRoute } from "@/components/protected-route";

export default function App() {
  return (
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
  );
}

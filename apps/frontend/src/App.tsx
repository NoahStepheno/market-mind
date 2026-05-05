import { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "@/pages/login";
import { CallbackPage } from "@/pages/callback";
import { ChatPage } from "@/pages/chat";
import { AlarmsPage } from "@/pages/alarms";
import { SettingsPage } from "@/pages/settings";
import { ProtectedRoute } from "@/components/protected-route";
import { AppLayout } from "@/components/app-layout";

export default function App() {
  return (
    <Suspense>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<CallbackPage />} />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <AppLayout>
                <ChatPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/alarms"
          element={
            <ProtectedRoute>
              <AppLayout>
                <AlarmsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <AppLayout>
                <SettingsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/home" element={<Navigate to="/chat" replace />} />
        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes>
    </Suspense>
  );
}

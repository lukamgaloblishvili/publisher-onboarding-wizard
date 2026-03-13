import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/Layout";
import { useAuthStore } from "./stores/useAuthStore";
import { usePortalStore } from "./stores/usePortalStore";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AdminPublisherPage } from "./pages/AdminPublisherPage";
import { CampaignPage } from "./pages/CampaignPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PublisherWorkspacePage } from "./pages/PublisherWorkspacePage";
import { ResourcesPage } from "./pages/ResourcesPage";

function ProtectedLayout() {
  const { user, loading, initialize } = useAuthStore();
  const currentPublisher = usePortalStore((state) => state.currentPublisher);
  const loadCurrentPublisher = usePortalStore((state) => state.loadCurrentPublisher);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (user) {
      loadCurrentPublisher().catch(() => undefined);
    }
  }, [loadCurrentPublisher, user]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-black/60">Loading session...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell>
      <Routes>
        <Route
          path="/"
          element={
            user.role === "admin" ? (
              <Navigate to="/admin" replace />
            ) : currentPublisher ? (
              <PublisherWorkspacePage publisher={currentPublisher} />
            ) : (
              <div className="app-card text-sm text-black/60">Loading dashboard...</div>
            )
          }
        />
        <Route path="/admin" element={user.role === "admin" ? <AdminDashboard /> : <Navigate to="/" replace />} />
        <Route path="/admin/publishers/:publisherId" element={user.role === "admin" ? <AdminPublisherPage /> : <Navigate to="/" replace />} />
        <Route path="/campaigns/:campaignId" element={user.role === "admin" ? <CampaignPage /> : <Navigate to="/" replace />} />
        <Route path="/resources" element={user.role === "admin" ? <ResourcesPage /> : <Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={<ProtectedLayout />} />
    </Routes>
  );
}

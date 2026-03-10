import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/Layout";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AdminPublisherPage } from "./pages/AdminPublisherPage";
import { CampaignPage } from "./pages/CampaignPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PublisherDashboard } from "./pages/PublisherDashboard";
import { ResourcesPage } from "./pages/ResourcesPage";
import { useEffect, useState } from "react";
import { api } from "./api/client";
import { Card } from "./components/Cards";

function ProtectedLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [publisher, setPublisher] = useState(null);

  useEffect(() => {
    if (!user) {
      return;
    }
    api.getCurrentPublisher().then(setPublisher).catch(() => setPublisher(null));
  }, [user, location.pathname]);

  if (loading) {
    return <div className="full-screen-state">Loading session...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={user.role === "admin" ? <Navigate to="/admin" replace /> : publisher ? <PublisherDashboard publisher={publisher} /> : <div className="empty-state">Loading dashboard...</div>} />
        <Route path="/admin" element={user.role === "admin" ? <AdminDashboard /> : <Navigate to="/" replace />} />
        <Route path="/admin/publishers/:publisherId" element={user.role === "admin" ? <AdminPublisherPage /> : <Navigate to="/" replace />} />
        <Route path="/campaigns/:campaignId" element={<CampaignPage />} />
        <Route path="/resources" element={<ResourcesPage />} />
        <Route
          path="/admin/help"
          element={
            <Card title="Integration Mode">
              <p>The backend ships in mock adapter mode by default. Supply Jira and Monday credentials in `backend/.env` to switch to live APIs.</p>
            </Card>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<ProtectedLayout />} />
      </Routes>
    </AuthProvider>
  );
}

import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useSession } from "./SessionContext";
import { AppLayout } from "../layouts/AppLayout";
import { LandingPage } from "../pages/public/LandingPage";
import { LoginPage } from "../pages/public/LoginPage";
import { AccessPendingPage } from "../pages/app/AccessPendingPage";
import { AnalyzerPage } from "../pages/app/AnalyzerPage";
import { DashboardPage } from "../pages/app/DashboardPage";
import { DatasetPage } from "../pages/app/DatasetPage";
import { DetectionsPage } from "../pages/app/DetectionsPage";
import { DispatchPage } from "../pages/app/DispatchPage";
import { FleetPage } from "../pages/app/FleetPage";
import { MapPage } from "../pages/app/MapPage";
import { PersonnelPage } from "../pages/app/PersonnelPage";
import { SettingsPage } from "../pages/app/SettingsPage";
import { SourcesPage } from "../pages/app/SourcesPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { LoadingScreen } from "../components/ui/Feedback";

function ProtectedApp() {
  const session = useSession();
  const location = useLocation();
  if (session.loading)
    return <LoadingScreen label="Opening operations console" />;
  if (!session.authenticated)
    return <Navigate to="/login" replace state={{ from: location }} />;
  if (!session.user?.isStaff)
    return <Navigate to="/app/access-pending" replace />;
  return <AppLayout />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth" element={<Navigate to="/login" replace />} />
      <Route path="/app/access-pending" element={<AccessPendingPage />} />
      <Route path="/app" element={<ProtectedApp />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="detections" element={<DetectionsPage />} />
        <Route path="dispatch" element={<DispatchPage />} />
        <Route path="fleet" element={<FleetPage />} />
        <Route path="analyzer" element={<AnalyzerPage />} />
        <Route path="dataset" element={<DatasetPage />} />
        <Route path="sources" element={<SourcesPage />} />
        <Route path="personnel" element={<PersonnelPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import ProtectedRoute from "./auth/ProtectedRoute";
import LoginPage from "./auth/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import FleetPage from "./pages/FleetPage";
import WorkOrdersPage from "./pages/WorkOrdersPage";
import WorkOrderDetailPage from "./pages/WorkOrderDetailPage";
import InventoryPage from "./pages/InventoryPage";
import WarehousesPage from "./pages/WarehousesPage";
import ProcurementPage from "./pages/ProcurementPage";
import RFQPOPage from "./pages/RFQPOPage";
import AssetsPage from "./pages/AssetsPage";
import IPSASPage from "./pages/IPSASPage";
import ReportsPage from "./pages/ReportsPage";
import BERPage from "./pages/BERPage";
import FRACASPage from "./pages/FRACASPage";
import PredictivePage from "./pages/PredictivePage";
import ObsolescencePage from "./pages/ObsolescencePage";
import AuditPage from "./pages/AuditPage";
import SettingsPage from "./pages/SettingsPage";
import MaintenancePage from "./pages/MaintenancePage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="fleet" element={<FleetPage />} />
        <Route path="work-orders" element={<WorkOrdersPage />} />
        <Route path="work-orders/:id" element={<WorkOrderDetailPage />} />
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="warehouses" element={<WarehousesPage />} />
        <Route path="procurement" element={<ProcurementPage />} />
        <Route path="rfq-po" element={<RFQPOPage />} />
        <Route path="assets" element={<AssetsPage />} />
        <Route path="ipsas" element={<IPSASPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="ber" element={<BERPage />} />
        <Route path="fracas" element={<FRACASPage />} />
        <Route path="predictive" element={<PredictivePage />} />
        <Route path="obsolescence" element={<ObsolescencePage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

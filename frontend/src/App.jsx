import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout.jsx";
import ClientsPage from "./pages/ClientsPage.jsx";
import InventoryPage from "./pages/InventoryPage.jsx";
import SalesOrdersPage from "./pages/SalesOrdersPage.jsx";
import SalesOrderFormPage from "./pages/SalesOrderFormPage.jsx";
import SalesOrderViewPage from "./pages/SalesOrderViewPage.jsx";
import TaxRulesPage from "./pages/TaxRulesPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import InvoicesPage from "./pages/InvoicesPage.jsx";
import InvoiceDetailPage from "./pages/InvoiceDetailPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import OffersPage from "./pages/OffersPage.jsx";
import OfferSimulatorPage from "./pages/OfferSimulatorPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/sales" element={<SalesOrdersPage />} />
        <Route path="/sales/new" element={<SalesOrderFormPage />} />
        <Route path="/sales/:id" element={<SalesOrderViewPage />} />
        <Route path="/sales/:id/edit" element={<SalesOrderFormPage />} />
        <Route path="/taxes" element={<TaxRulesPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/offers" element={<OffersPage />} />
        <Route path="/offers/simulator" element={<OfferSimulatorPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

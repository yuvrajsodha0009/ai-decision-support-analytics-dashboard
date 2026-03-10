import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "./components/DashboardLayout";
import PrivateRoute from "./components/PrivateRoute";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import DashboardPage from "./pages/DashBoardPage";
import CategoryAnalytics from "./pages/CategoryAnalytics";
import SettingsPage from "./pages/SettingsPage";
import CsvUploadPage from "./pages/CsvUploadPage";
import ApiData from "./pages/ApiData";
import KPIPage from "./pages/kpiPage";
import DataCleaningPage from "./pages/DataCleaningPage";
import ReportPage from "./pages/ReportPage";
import AdminManagementPage from "./pages/AdminManagementPage";
import DataQualityPage from "./pages/DataQualityPage";
import ActivityLogPage from "./pages/ActivityLogPage";
import AdminSalesPage from "./pages/AdminSalesPage";
import MapAnalytics from "./pages/MapAnalytics";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />

        <Route element={<DashboardLayout />}>
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/dashboard/category/:categoryName"
            element={
              <PrivateRoute>
                <CategoryAnalytics />
              </PrivateRoute>
            }
          />

          <Route
            path="/dashboard/map"
            element={
              <PrivateRoute>
                <MapAnalytics />
              </PrivateRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <SettingsPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/csv"
            element={
              <PrivateRoute>
                <CsvUploadPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/csv-upload"
            element={
              <PrivateRoute>
                <CsvUploadPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/api-data"
            element={
              <PrivateRoute>
                <ApiData />
              </PrivateRoute>
            }
          />

          <Route
            path="/kpis"
            element={
              <PrivateRoute>
                <KPIPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/data-cleaning"
            element={
              <PrivateRoute>
                <DataCleaningPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <PrivateRoute>
                <ReportPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <PrivateRoute requireAdmin>
                <AdminManagementPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/data-quality"
            element={
              <PrivateRoute requireAdmin>
                <DataQualityPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/activity-log"
            element={
              <PrivateRoute requireAdmin>
                <ActivityLogPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/sales"
            element={
              <PrivateRoute requireAdmin>
                <Navigate to="/admin/sales" replace />
              </PrivateRoute>
            }
          />

          <Route
            path="/admin/sales"
            element={
              <PrivateRoute requireAdmin>
                <AdminSalesPage />
              </PrivateRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

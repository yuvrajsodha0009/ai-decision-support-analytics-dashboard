import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardLayout from "./components/DashboardLayout";
import DashboardPage from "./pages/DashBoardPage";
import CsvUploadPage from "./pages/CsvUploadPage";
import ApiData from "./pages/ApiData";
import KPIPage from "./pages/kpiPage";
import DataCleaningPage from "./pages/DataCleaningPage";
import ReportPage from "./pages/ReportPage";
import ActivityLogPage from "./pages/ActivityLogPage";
import DataQualityPage from "./pages/DataQualityPage";
import SalesPage from "./pages/SalesPage";
import AdminManagementPage from "./pages/AdminManagementPage";
import SettingsPage from "./pages/SettingsPage";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import PrivateRoute from "./components/PrivateRoute";

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

          {/* Alias for direct /csv-upload links */}
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

          {/* 🔥 KPI ROUTE */}
          <Route
            path="/kpis"
            element={
              <PrivateRoute>
                <KPIPage />
              </PrivateRoute>
            }
          />

          {/* 🔥 DATA CLEANING ROUTE */}
          <Route
            path="/data-cleaning"
            element={
              <PrivateRoute>
                <DataCleaningPage />
              </PrivateRoute>
            }
          />

          {/* 🔥 REPORT ROUTE */}
          <Route
            path="/reports"
            element={
              <PrivateRoute>
                <ReportPage />
              </PrivateRoute>
            }
          />

          {/* 🔥 ADMIN MANAGEMENT ROUTE */}
          <Route
            path="/admin"
            element={
              <PrivateRoute requireAdmin>
                <AdminManagementPage />
              </PrivateRoute>
            }
          />

          {/* 🔥 DATA QUALITY ROUTE */}
          <Route
            path="/data-quality"
            element={
              <PrivateRoute requireAdmin>
                <DataQualityPage />
              </PrivateRoute>
            }
          />

          {/* 🔥 ACTIVITY LOG ROUTE */}
          <Route
            path="/activity-log"
            element={
              <PrivateRoute requireAdmin>
                <ActivityLogPage />
              </PrivateRoute>
            }
          />

          {/* 🔥 SALES ANALYTICS ROUTE */}
          <Route
            path="/sales"
            element={
              <PrivateRoute requireAdmin>
                <SalesPage />
              </PrivateRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

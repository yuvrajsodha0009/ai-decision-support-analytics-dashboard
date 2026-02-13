import { useState } from "react";
import {
  FileText,
  Download,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  Clock,
  Zap,
  BarChart3,
} from "lucide-react";

const ReportPage = () => {
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [selectedModules, setSelectedModules] = useState({
    sales: true,
    apiData: true,
    csvUpload: true,
    dataQuality: true,
  });

  const modules = [
    {
      id: "sales",
      label: "Sales Dashboard",
      description: "Products, categories, and revenue data",
    },
    {
      id: "apiData",
      label: "API Data",
      description: "All API batch records and insights",
    },
    {
      id: "csvUpload",
      label: "CSV Uploads",
      description: "Uploaded CSV data and analytics",
    },
    {
      id: "dataQuality",
      label: "Data Quality",
      description: "Quality metrics and analysis",
    },
  ];

  const toggleModule = (moduleId) => {
    setSelectedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  const exportToPDF = async () => {
    if (Object.values(selectedModules).every((v) => !v)) {
      alert("Please select at least one module to export");
      return;
    }

    try {
      setLoadingPdf(true);
      const response = await fetch(
        "http://localhost:5000/api/reports/export/pdf",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ modules: selectedModules }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics-report-${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      alert("PDF report exported successfully!");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      alert("Failed to export PDF report");
    } finally {
      setLoadingPdf(false);
    }
  };

  const exportToExcel = async () => {
    if (Object.values(selectedModules).every((v) => !v)) {
      alert("Please select at least one module to export");
      return;
    }

    try {
      setLoadingExcel(true);
      const response = await fetch(
        "http://localhost:5000/api/reports/export/excel",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ modules: selectedModules }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate Excel file");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics-report-${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      alert("Excel report exported successfully!");
    } catch (error) {
      console.error("Error exporting Excel:", error);
      alert("Failed to export Excel report");
    } finally {
      setLoadingExcel(false);
    }
  };

  return (
    <div className="p-8 bg-[var(--bg-page)] text-[var(--text-main)] min-h-screen">
      {/* Professional Header with Logo */}
      <div className="mb-12 flex items-center gap-4">
        <div className="p-4 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl shadow-xl transform hover:scale-105 transition-transform duration-300">
          <BarChart3 className="text-white" size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            Reports & Analytics
          </h1>
          <p className="text-slate-500 dark:text-slate-300 mt-1">
            Export comprehensive reports of all your data and insights
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl">
        {/* Overview Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Card 1 */}
          <div className="surface-card p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="p-3 bg-blue-100 rounded-lg mb-4 w-fit">
              <Zap className="text-blue-600" size={24} />
            </div>
            <h3 className="font-semibold text-[var(--text-main)] mb-2">
              Real-Time Generation
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Reports are generated instantly with your latest data
            </p>
          </div>

          {/* Card 2 */}
          <div className="surface-card p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="p-3 bg-purple-100 rounded-lg mb-4 w-fit">
              <CheckCircle2 className="text-purple-600" size={24} />
            </div>
            <h3 className="font-semibold text-[var(--text-main)] mb-2">Complete Data</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              All modules and metrics included in every export
            </p>
          </div>

          {/* Card 3 */}
          <div className="surface-card p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="p-3 bg-indigo-100 rounded-lg mb-4 w-fit">
              <Clock className="text-indigo-600" size={24} />
            </div>
            <h3 className="font-semibold text-[var(--text-main)] mb-2">
              Auto-Timestamped
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Files automatically dated for easy organization
            </p>
          </div>
        </div>

        {/* Module Selection */}
        <div className="surface-card mb-8 rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-[var(--text-main)] mb-6">
            Select Modules to Include
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {modules.map((module) => (
              <div
                key={module.id}
                onClick={() => toggleModule(module.id)}
                className={`p-5 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                  selectedModules[module.id]
                    ? "border-indigo-600 bg-indigo-50 dark:bg-slate-800 shadow-md"
                    : "border-[var(--border-soft)] bg-[var(--bg-surface)] hover:border-indigo-300"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center mt-1 transition-all ${
                      selectedModules[module.id]
                        ? "bg-indigo-600 border-indigo-600"
                        : "border-slate-400"
                    }`}
                  >
                    {selectedModules[module.id] && (
                      <CheckCircle2 size={20} className="text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-[var(--text-main)]">
                      {module.label}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                      {module.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 rounded-2xl shadow-xl border border-slate-100 mb-8 text-white">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white bg-opacity-20 rounded-xl flex-shrink-0">
              <FileText size={28} />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-3">
                Comprehensive Data Export
              </h2>
              <p className="text-blue-100 mb-5">
                Download a complete report containing all your analytics data
                from across the platform. Choose your preferred format below to
                get started.
              </p>
              <div className="bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg p-5 backdrop-blur-sm">
                <p className="text-sm font-semibold text-blue-50 mb-3">
                  📊 Report Includes:
                </p>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2
                      size={18}
                      className="text-blue-200 flex-shrink-0 mt-0.5"
                    />
                    <span className="text-sm text-blue-100">
                      Sales Dashboard Data (Products, Categories, Revenue)
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2
                      size={18}
                      className="text-blue-200 flex-shrink-0 mt-0.5"
                    />
                    <span className="text-sm text-blue-100">
                      API Data Records (All Batches)
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2
                      size={18}
                      className="text-blue-200 flex-shrink-0 mt-0.5"
                    />
                    <span className="text-sm text-blue-100">
                      Custom KPIs (All Tracked Metrics)
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2
                      size={18}
                      className="text-blue-200 flex-shrink-0 mt-0.5"
                    />
                    <span className="text-sm text-blue-100">
                      CSV Uploaded Data
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2
                      size={18}
                      className="text-blue-200 flex-shrink-0 mt-0.5"
                    />
                    <span className="text-sm text-blue-100">
                      Data Cleaning Records
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2
                      size={18}
                      className="text-blue-200 flex-shrink-0 mt-0.5"
                    />
                    <span className="text-sm text-blue-100">
                      Summary Statistics and Insights
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Export Options */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* PDF Export Card */}
          <div className="surface-card rounded-2xl shadow-xl border border-[var(--border-soft)] overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105 group">
            <div className="h-2 bg-gradient-to-r from-red-600 to-rose-600"></div>
            <div className="p-8 flex flex-col items-center text-center">
              <div className="p-5 bg-gradient-to-br from-red-600 to-rose-600 rounded-2xl mb-6 shadow-lg group-hover:shadow-xl transition-shadow transform group-hover:scale-110 duration-300">
                <FileText className="text-white" size={56} />
              </div>
              <h3 className="text-2xl font-bold text-[var(--text-main)] mb-3">
                PDF Report
              </h3>
              <p className="text-slate-600 dark:text-slate-300 mb-2 text-sm leading-relaxed">
                Download a beautifully formatted PDF document with all your
                analytics data, charts, and visualizations.
              </p>
              <p className="text-xs text-slate-500 mb-6">
                Perfect for sharing, printing, and presentations
              </p>
              <button
                onClick={exportToPDF}
                disabled={loadingPdf}
                className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loadingPdf ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    <span>Export to PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Excel Export Card */}
          <div className="surface-card rounded-2xl shadow-xl border border-[var(--border-soft)] overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105 group">
            <div className="h-2 bg-gradient-to-r from-green-600 to-emerald-600"></div>
            <div className="p-8 flex flex-col items-center text-center">
              <div className="p-5 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl mb-6 shadow-lg group-hover:shadow-xl transition-shadow transform group-hover:scale-110 duration-300">
                <FileSpreadsheet className="text-white" size={56} />
              </div>
              <h3 className="text-2xl font-bold text-[var(--text-main)] mb-3">
                Excel Report
              </h3>
              <p className="text-slate-600 dark:text-slate-300 mb-2 text-sm leading-relaxed">
                Download a comprehensive Excel spreadsheet with multiple sheets
                for detailed data analysis and manipulation.
              </p>
              <p className="text-xs text-slate-500 mb-6">
                Ideal for advanced analysis, formulas, and pivot tables
              </p>
              <button
                onClick={exportToExcel}
                disabled={loadingExcel}
                className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loadingExcel ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Generating Excel...</span>
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    <span>Export to Excel</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="surface-card rounded-2xl p-8 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex-shrink-0">
              <FileText className="text-white" size={24} />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-[var(--text-main)] mb-3 text-lg">
                About Your Reports
              </h4>
              <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mb-3">
                Reports are generated in real-time and include all current data
                from your analytics dashboard. File names automatically include
                the current date for easy organization and archiving.
              </p>
              <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                Both PDF and Excel formats contain the same comprehensive data -
                choose the format that works best for your workflow. PDFs are
                great for viewing and sharing, while Excel is perfect for
                further analysis and manipulation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPage;

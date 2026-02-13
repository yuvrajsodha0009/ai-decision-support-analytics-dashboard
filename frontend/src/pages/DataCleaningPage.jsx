import { useState } from "react";
import axios from "axios";
import {
  Sparkles,
  FileCheck,
  Download,
  Upload as UploadIcon,
  CheckCircle2,
  XCircle,
  FileType,
  Eraser,
  Copy,
  Sigma,
} from "lucide-react";
import logo from "../assets/logo.svg";
import MessageBar from "../components/MessageBar";

const DataPreprocessingPage = () => {
  const [file, setFile] = useState(null);
  const [processedData, setProcessedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [options, setOptions] = useState({
    removeMissing: true,
    removeDuplicates: true,
    normalize: true,
  });
  const [success, setSuccess] = useState("");

  const handleBrowse = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const allowedTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/json",
      "text/plain",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError(
        "Unsupported file type. Please upload CSV, Excel, JSON, or TXT.",
      );
      setFile(null);
      return;
    }

    setError("");
    setFile(selectedFile);
  };

  const handlePreprocess = async () => {
    if (!file) {
      alert("Please select a file first");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("removeMissing", String(options.removeMissing));
      formData.append("removeDuplicates", String(options.removeDuplicates));
      formData.append("normalize", String(options.normalize));

      const res = await axios.post(
        "http://localhost:5000/api/data-cleaning/preprocess",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      // Handle both response formats: { data: [...], stats: {...} } or just [...]
      const processedData = res.data.data || res.data;
      const stats = res.data.stats;

      setProcessedData(processedData);

      if (stats) {
        const successMsg =
          `Processed ${processedData.length} rows successfully. ` +
          `${stats.removedMissing > 0 ? `Removed ${stats.removedMissing} rows with missing values. ` : ""}` +
          `${stats.removedDuplicates > 0 ? `Removed ${stats.removedDuplicates} duplicate rows.` : ""}`;
        setSuccess(successMsg);
      } else {
        setSuccess(`Processed ${processedData.length} rows successfully`);
      }
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to preprocess data. Check backend server.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const exportCSVClient = () => {
    if (!processedData.length) return;
    const keys = Object.keys(processedData[0]);
    const rows = processedData.map((r) =>
      keys
        .map((k) => {
          const v = r[k];
          if (typeof v === "string" && v.includes(","))
            return `"${v.replace(/"/g, '"')}"`;
          return v;
        })
        .join(","),
    );
    const csv = [keys.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `processed_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    window.location.href = "http://localhost:5000/api/data-cleaning/export/pdf";
  };

  const exportExcel = () => {
    window.location.href =
      "http://localhost:5000/api/data-cleaning/export/excel";
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-main)]">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <img
            src={logo}
            alt="Analytics Logo"
            className="w-12 h-12 rounded-xl shadow-lg"
          />
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Data Cleaning Studio
            </h1>
            <p className="text-slate-500 dark:text-slate-300 mt-1">
              Remove missing values, deduplicate, and normalize for AI
            </p>
          </div>
        </div>

        {/* Upload Section */}
        <div className="surface-card p-10 rounded-2xl shadow-xl max-w-6xl mb-8">
          <MessageBar
            type={error ? "error" : success ? "success" : "info"}
            message={error || success}
            onClose={() => {
              setError("");
              setSuccess("");
            }}
          />
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl">
              <UploadIcon className="text-white" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">
              Upload & Process
            </h2>
          </div>

          <div className="space-y-6">
            <div className="border-2 border-dashed border-emerald-300 dark:border-emerald-500/60 rounded-xl p-8 bg-[var(--bg-surface)] hover:border-emerald-400 transition-colors">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="p-4 bg-white rounded-full shadow-lg">
                  <FileType className="text-emerald-600" size={32} />
                </div>
                <div className="text-center">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-lg font-semibold text-[var(--text-main)]">
                      Choose a file to preprocess
                    </span>
                    <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">
                      CSV, Excel, JSON, or TXT files supported
                    </p>
                  </label>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept=".csv,.xlsx,.xls,.json,.txt"
                  onChange={handleBrowse}
                  className="hidden"
                />
                <label
                  htmlFor="file-upload"
                  className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all cursor-pointer"
                >
                  Browse Files
                </label>
              </div>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-3 p-3 surface-card rounded-xl">
                <input
                  type="checkbox"
                  checked={options.removeMissing}
                  onChange={(e) =>
                    setOptions((o) => ({
                      ...o,
                      removeMissing: e.target.checked,
                    }))
                  }
                />
                <span className="inline-flex items-center gap-2 text-[var(--text-main)]">
                  <span className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                    <Eraser className="text-emerald-600" size={16} />
                  </span>
                  Remove Missing Values
                </span>
              </label>
              <label className="flex items-center gap-3 p-3 surface-card rounded-xl">
                <input
                  type="checkbox"
                  checked={options.removeDuplicates}
                  onChange={(e) =>
                    setOptions((o) => ({
                      ...o,
                      removeDuplicates: e.target.checked,
                    }))
                  }
                />
                <span className="inline-flex items-center gap-2 text-[var(--text-main)]">
                  <span className="p-2 rounded-lg bg-cyan-50 border border-cyan-200">
                    <Copy className="text-cyan-600" size={16} />
                  </span>
                  Remove Duplicates
                </span>
              </label>
              <label className="flex items-center gap-3 p-3 surface-card rounded-xl">
                <input
                  type="checkbox"
                  checked={options.normalize}
                  onChange={(e) =>
                    setOptions((o) => ({ ...o, normalize: e.target.checked }))
                  }
                />
                <span className="inline-flex items-center gap-2 text-[var(--text-main)]">
                  <span className="p-2 rounded-lg bg-teal-50 border border-teal-200">
                    <Sigma className="text-teal-600" size={16} />
                  </span>
                  Normalize Numeric Values
                </span>
              </label>
            </div>

            {file && (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-slate-800 border border-emerald-200 dark:border-[var(--border-soft)] rounded-xl">
                <CheckCircle2 className="text-emerald-600" size={24} />
                <div className="flex-1">
                  <p className="text-sm text-slate-600 dark:text-slate-300">Selected file:</p>
                  <p className="font-semibold text-[var(--text-main)]">{file.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <button
                  onClick={handlePreprocess}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    "Preprocess Data"
                  )}
                </button>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-400/40 rounded-xl">
                <XCircle className="text-red-600" size={24} />
                <p className="text-red-700 dark:text-red-200 font-medium">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Processed Data Results */}
        {processedData.length > 0 && (
          <div className="surface-card p-10 rounded-2xl shadow-xl max-w-6xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl">
                  <FileCheck className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[var(--text-main)]">
                    Processed Data Results
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-300">
                    {processedData.length} rows processed successfully
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={exportPDF}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                >
                  <Download size={20} />
                  Export PDF
                </button>
                <button
                  onClick={exportExcel}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                >
                  <Download size={20} />
                  Export Excel
                </button>
                <button
                  onClick={exportCSVClient}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-sky-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                >
                  <Download size={20} />
                  Export CSV
                </button>
              </div>
            </div>

            <div className="overflow-auto max-h-[500px] border border-[var(--border-soft)] rounded-xl shadow-inner">
              <table className="table-auto w-full text-sm">
                <thead className="table-head sticky top-0">
                  <tr>
                    {Object.keys(processedData[0]).map((key) => (
                      <th
                        key={key}
                        className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-xs"
                      >
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-[var(--bg-surface)] divide-y divide-[var(--border-soft)]">
                  {processedData.map((row, i) => (
                    <tr
                      key={i}
                      className="table-row table-row-hover transition-colors"
                    >
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="px-4 py-3 text-slate-700 dark:text-slate-200">
                          {typeof val === "number" ? val.toFixed(4) : val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataPreprocessingPage;

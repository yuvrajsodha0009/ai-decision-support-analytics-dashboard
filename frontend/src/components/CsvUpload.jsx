import { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  Upload,
  FileSpreadsheet,
  BarChart2,
  PieChart as PieChartIcon,
  Filter,
  Edit,
  History,
  Trash,
  Check,
  X,
  Table,
} from "lucide-react";

// Currency formatter for Rupees
const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const colors = [
  "#f59e0b",
  "#f97316",
  "#ef4444",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#14b8a6",
];

const CsvUpload = () => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState("all");
  const [filters, setFilters] = useState({ startDate: "", endDate: "" });
  const [csvSummary, setCsvSummary] = useState(null);
  const [csvInsights, setCsvInsights] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const chartRef = useRef(null);

  const applyDateFilter = (items) => {
    if (!filters.startDate && !filters.endDate) return items;
    const start = filters.startDate ? new Date(filters.startDate) : null;
    const end = filters.endDate ? new Date(filters.endDate) : null;
    return items.filter((item) => {
      if (!item.uploadedAt) return true;
      const d = new Date(item.uploadedAt);
      if (Number.isNaN(d.getTime())) return true;
      if (start && d < start) return false;
      if (end) {
        const endOfDay = new Date(end);
        endOfDay.setHours(23, 59, 59, 999);
        if (d > endOfDay) return false;
      }
      return true;
    });
  };

  const fetchData = async (batchOverride) => {
    const batch = batchOverride ?? selectedBatch;
    try {
      const url =
        batch && batch !== "all"
          ? `http://localhost:5000/api/data/batch/${batch}`
          : "http://localhost:5000/api/data/all";
      const res = await axios.get(url);
      const items = Array.isArray(res.data) ? res.data : [];
      const filtered = applyDateFilter(items);
      setData(filtered);
      return items;
    } catch (error) {
      console.error("Failed to load data", error);
      setMessage("Failed to load data");
      return [];
    }
  };

  const fetchBatches = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/data/batches");
      // Extract batch IDs from the response objects
      const batchIds = (res.data || []).map((batch) => batch._id);
      setBatches(batchIds);
    } catch (error) {
      console.error("Failed to load batches", error);
    }
  };

  const fetchCsvSummary = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/csv/summary");
      setCsvSummary(res.data);
    } catch (error) {
      console.error("Failed to load CSV summary", error);
    }
  };

  const fetchCsvInsights = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/csv/batch-insights",
      );
      setCsvInsights(res.data);
    } catch (error) {
      console.error("Failed to load CSV insights", error);
    }
  };

  const uploadCsv = async () => {
    if (!file) {
      setMessage("Please select a CSV file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      await axios.post("http://localhost:5000/api/data/upload-csv", formData);
      setMessage("CSV uploaded successfully (new batch added)");
      setFile(null);
      setSelectedBatch("all");
      await fetchData("all");
      await fetchBatches();
      await fetchCsvSummary();
      await fetchCsvInsights();
    } catch (error) {
      console.error("Upload failed", error);
      setMessage("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleBatchChange = async (value) => {
    setSelectedBatch(value);
    await fetchData(value);
  };

  const applyFilters = async () => {
    const items = await fetchData(selectedBatch);
    setData(applyDateFilter(items));
  };

  const deleteSelectedBatch = async () => {
    if (selectedBatch === "all") return;
    if (!window.confirm("Delete this batch permanently?")) return;
    try {
      await axios.delete(
        `http://localhost:5000/api/data/batch/${selectedBatch}`,
      );
      setMessage("Batch deleted successfully");
      setSelectedBatch("all");
      await fetchData("all");
      await fetchBatches();
      await fetchCsvSummary();
      await fetchCsvInsights();
    } catch (error) {
      console.error("Delete batch failed", error);
      setMessage("Delete failed");
    }
  };

  const deleteData = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/data/${id}`);
      await fetchData(selectedBatch);
    } catch (error) {
      console.error("Delete record failed", error);
      setMessage("Delete failed");
    }
  };

  const fetchBatchHistory = async (batchId) => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/data/batch/${batchId}`,
      );
      setHistory(res.data || []);
      setShowHistory(true);
    } catch (error) {
      console.error("Failed to load history", error);
      setMessage("Unable to load history");
    }
  };

  const saveEdit = async () => {
    if (!editingRow) return;
    try {
      await axios.put(`http://localhost:5000/api/data/${editingRow._id}`, {
        title: editingRow.title,
        value: editingRow.value,
        rawData: editingRow.rawData,
        batchId: editingRow.batchId,
      });
      setEditingRow(null);
      await fetchData(selectedBatch);
    } catch (error) {
      console.error("Save edit failed", error);
      setMessage("Save failed");
    }
  };

  const exportTable = () => {
    if (!data.length) return;
    const header = "Title,Value,Category,Batch";
    const rows = data.map(
      (d) =>
        `${d.title},${d.value},${d.rawData?.category || "N/A"},${d.batchId}`,
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "csv-data.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchData("all");
    fetchBatches();
    fetchCsvSummary();
    fetchCsvInsights();
  }, []);

  const batchChartData =
    csvInsights?.batches?.map((b, i) => ({
      name: `Batch ${i + 1}`,
      value: Number(b.totalValue ?? 0),
      date: b.uploadedAt ? new Date(b.uploadedAt).toLocaleDateString() : "",
    })) || [];

  const values = batchChartData.map((b) => b.value);
  const maxValue = values.length ? Math.max(...values) : 0;
  const minValue = values.length ? Math.min(...values) : 0;
  const bestBatch = batchChartData.find((b) => b.value === maxValue);
  const worstBatch = batchChartData.find((b) => b.value === minValue);

  // Aggregate rows by category for the pie chart (sum values per category)
  const categoryData = data.reduce((acc, row) => {
    const category = row.rawData?.category ?? row.title ?? "Uncategorized";
    const value = Number(row.value ?? 0) || 0;
    const existing = acc.find((c) => c.name === category);
    if (existing) existing.value += value;
    else acc.push({ name: category, value });
    return acc;
  }, []);

  return (
    <div className="p-8 min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-slate-50">
      <div className="mb-6 flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <div className="p-4 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl shadow-2xl shadow-orange-500/30">
            <FileSpreadsheet className="text-white" size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-amber-200 to-orange-300 bg-clip-text text-transparent">
              CSV Data Management
            </h1>
            <p className="text-slate-300 mt-1">
              Upload, analyze, and manage your CSV datasets
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-amber-200 border border-white/20 shadow-sm">
          CSV workspace
        </span>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-6">
        <div className="rounded-2xl border border-amber-300/30 bg-white/5 backdrop-blur shadow-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-amber-200 font-semibold">
              Total Value
            </p>
            <p className="text-2xl font-bold text-white mt-1">
              {formatCurrency(csvSummary?.totalValue ?? 0)}
            </p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-100 border border-amber-400/40">
            INR
          </span>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-white/5 backdrop-blur shadow-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-300 font-semibold">
              Batches
            </p>
            <p className="text-2xl font-bold text-white mt-1">
              {batches.length}
            </p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
            {selectedBatch === "all" ? "All" : "Filtered"}
          </span>
        </div>
        <div className="rounded-2xl border border-emerald-300/30 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 shadow-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-emerald-200 font-semibold">
              Records
            </p>
            <p className="text-2xl font-bold text-white mt-1">{data.length}</p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-emerald-100 border border-emerald-200/40">
            Live
          </span>
        </div>
      </div>

      {csvSummary && csvInsights && (
        <div className="bg-gradient-to-r from-amber-500 to-rose-500 text-white p-6 rounded-2xl shadow-2xl mb-8 border border-amber-600/20 backdrop-blur">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-white/10">
              <FileSpreadsheet className="text-white" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold">CSV Decision Support</h3>
              <p className="text-sm text-amber-100">
                Batch-level insights & recommendations
              </p>
            </div>
            <div className="text-sm text-amber-100">
              Batches: {batches.length}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 p-4 rounded-lg">
              <p className="text-xs uppercase text-amber-100 font-semibold">
                Total Value
              </p>
              <p className="mt-2 text-lg font-bold">
                {formatCurrency(csvSummary.totalValue ?? 0)}
              </p>
            </div>

            <div className="bg-white/10 p-4 rounded-lg">
              <p className="text-xs uppercase text-amber-100 font-semibold">
                Best Batch
              </p>
              <p className="mt-2 text-lg font-bold">
                {bestBatch?.name ?? "n/a"}
              </p>
            </div>

            <div className="bg-white/10 p-4 rounded-lg">
              <p className="text-xs uppercase text-amber-100 font-semibold">
                Worst Batch
              </p>
              <p className="mt-2 text-lg font-bold">
                {worstBatch?.name ?? "n/a"}
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-white/10 rounded-lg text-sm text-amber-50">
            <div>
              <strong>Trend:</strong> {csvInsights.trend ?? "n/a"}
            </div>
            <div className="mt-2">
              <strong>Recommendation:</strong>{" "}
              {csvInsights.recommendation ?? "n/a"}
            </div>
          </div>

          {/* PDF export removed per request */}
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-2xl shadow-2xl shadow-black/30 mb-8 p-6 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3 justify-between mb-4">
          <div className="flex items-center gap-2">
            <Upload size={22} className="text-amber-300" />
            <h2 className="text-xl font-semibold text-white">
              Upload CSV File
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={async () => {
                await fetchData(selectedBatch);
                await fetchCsvSummary();
                await fetchCsvInsights();
                setMessage("Data refreshed successfully");
              }}
              className="px-4 py-2 rounded-lg border border-white/20 text-slate-100 text-sm hover:border-amber-300/60 hover:bg-white/5 transition"
            >
              Refresh Data
            </button>
            <button
              onClick={async () => {
                await fetchBatches();
                setMessage("Batches reloaded successfully");
              }}
              className="px-4 py-2 rounded-lg border border-white/20 text-slate-100 text-sm hover:border-amber-300/60 hover:bg-white/5 transition"
            >
              Reload Batches
            </button>
            <button
              onClick={deleteSelectedBatch}
              className="px-4 py-2 rounded-lg border border-red-500/50 text-red-100 text-sm hover:bg-red-500/10 hover:border-red-400/60 transition disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={selectedBatch === "all"}
              title={
                selectedBatch === "all"
                  ? "Select a specific batch to delete"
                  : "Delete selected batch"
              }
            >
              Delete Batch
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="flex-1 min-w-[220px] border border-white/20 bg-white/5 text-slate-100 rounded-lg px-3 py-2 focus:border-amber-300 focus:outline-none transition"
          />
          <button
            onClick={uploadCsv}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Upload size={20} />
            {loading ? "Uploading..." : "Upload"}
          </button>
        </div>
        {message && (
          <p className="mt-3 text-sm text-amber-100 bg-white/10 border border-amber-200/40 px-4 py-3 rounded-lg font-medium">
            {message}
          </p>
        )}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl shadow-xl shadow-black/20 mb-8 p-6 backdrop-blur">
        <div className="flex items-center gap-3 mb-4 text-white">
          <Filter className="text-amber-300" />
          <h2 className="text-xl font-semibold">Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm text-slate-200/80">
              Select Batch
            </label>
            <select
              value={selectedBatch}
              onChange={(e) => handleBatchChange(e.target.value)}
              className="w-full border border-white/15 bg-white/5 text-white rounded-lg px-3 py-2 focus:border-amber-300 focus:outline-none"
            >
              <option value="all" className="bg-slate-900 text-white">
                All Batches
              </option>
              {batches.map((batch, index) => (
                <option
                  key={index}
                  value={batch}
                  className="bg-slate-900 text-white"
                >
                  Batch {batch}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-slate-200/80">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value })
              }
              className="w-full border border-white/15 bg-white/5 text-white rounded-lg px-3 py-2 focus:border-amber-300 focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-slate-200/80">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value })
              }
              className="w-full border border-white/15 bg-white/5 text-white rounded-lg px-3 py-2 focus:border-amber-300 focus:outline-none"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-3 flex-wrap">
          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 font-semibold rounded-lg hover:shadow-lg transition"
          >
            Apply Filters
          </button>
          <button
            onClick={() => {
              setFilters({ startDate: "", endDate: "" });
              handleBatchChange("all");
            }}
            className="px-4 py-2 border border-white/20 text-white rounded-lg hover:border-amber-300/60 transition"
          >
            Reset Filters
          </button>
        </div>
      </div>

      <div
        ref={chartRef}
        className="bg-white/5 border border-white/10 rounded-2xl shadow-xl shadow-black/20 mb-8 p-6 backdrop-blur"
      >
        <h2 className="text-lg font-semibold text-white mb-4">
          CSV Batch Trend Analysis
        </h2>
        {batchChartData.length === 1 && (
          <p className="text-sm text-slate-400 mb-2">
            Upload more CSV files to compare batch performance.
          </p>
        )}
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={batchChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                dataKey="name"
                stroke="#cbd5f5"
                tick={{ fill: "#cbd5f5" }}
              />
              <YAxis stroke="#cbd5f5" tick={{ fill: "#cbd5f5" }} />
              <Tooltip
                cursor={{ stroke: "#f97316" }}
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #1f2937",
                  background: "#0f172a",
                  color: "#e5e7eb",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#f97316"
                strokeWidth={3}
                dot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur shadow-xl shadow-black/20">
          <div className="flex items-center justify-between mb-4 text-white">
            <div className="flex items-center gap-2">
              <BarChart2 className="text-amber-300" />
              <h2 className="text-lg font-semibold">Data Overview</h2>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-white/10 border border-white/15">
              Records
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis
                  dataKey="name"
                  stroke="#cbd5f5"
                  angle={-25}
                  textAnchor="end"
                  height={60}
                  tick={{ fill: "#cbd5f5" }}
                />
                <YAxis stroke="#cbd5f5" tick={{ fill: "#cbd5f5" }} />
                <Tooltip
                  cursor={{ fill: "#0f172a" }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #1f2937",
                    background: "#0f172a",
                    color: "#e5e7eb",
                  }}
                />
                <Legend wrapperStyle={{ color: "#e5e7eb" }} />
                <Bar
                  dataKey="value"
                  fill="url(#barGradient)"
                  radius={[10, 10, 0, 0]}
                />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#f97316" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur shadow-xl shadow-black/20">
          <div className="flex items-center justify-between mb-4 text-white">
            <div className="flex items-center gap-2">
              <PieChartIcon className="text-amber-300" />
              <h2 className="text-lg font-semibold">Category Distribution</h2>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-white/10 border border-white/15">
              Category
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  fill="#f97316"
                  label
                >
                  {categoryData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={colors[index % colors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name, props) => [
                    value,
                    props?.payload?.name ?? props?.payload?.title ?? name,
                  ]}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #1f2937",
                    background: "#0f172a",
                    color: "#e5e7eb",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur shadow-2xl shadow-black/25">
        <div className="flex items-center justify-between mb-4 text-white">
          <div className="flex items-center gap-2">
            <Table className="text-amber-300" />
            <h2 className="text-lg font-semibold">Data Table</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportTable}
              className="px-3 py-2 rounded-lg border border-white/15 text-white text-sm hover:border-amber-300/60 transition"
            >
              Export Table
            </button>
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 font-semibold text-sm hover:shadow-lg transition"
            >
              {showHistory ? "Hide History" : "Show History"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
          <table className="min-w-full text-slate-100">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-300">
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Value</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Batch</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item._id} className="border-t border-white/5 text-sm">
                  <td className="py-3 px-4 font-medium text-white">
                    {item.title}
                  </td>
                  <td className="py-3 px-4 text-amber-100">{item.value}</td>
                  <td className="py-3 px-4 text-slate-200">
                    {item.rawData?.category || "N/A"}
                  </td>
                  <td className="py-3 px-4 text-slate-200">{item.batchId}</td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end gap-2 flex-wrap">
                      <button
                        onClick={() => setEditingRow(item)}
                        className="px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-white hover:border-amber-300/60 flex items-center gap-1 text-xs"
                      >
                        <Edit size={14} />
                        Edit
                      </button>
                      <button
                        onClick={() => fetchBatchHistory(item.batchId)}
                        className="px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-white hover:border-amber-300/60 flex items-center gap-1 text-xs"
                      >
                        <History size={14} />
                        History
                      </button>
                      <button
                        onClick={() => deleteData(item._id)}
                        className="px-3 py-2 rounded-lg border border-red-500/40 bg-red-500/10 text-red-100 hover:bg-red-500/20 flex items-center gap-1 text-xs"
                      >
                        <Trash size={14} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingRow && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl shadow-2xl w-full max-w-md text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Edit className="text-amber-300" />
                <h2 className="text-xl font-semibold">Edit Entry</h2>
              </div>
              <button
                onClick={() => setEditingRow(null)}
                className="text-slate-400 hover:text-amber-200"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editingRow.title}
                  onChange={(e) =>
                    setEditingRow({ ...editingRow, title: e.target.value })
                  }
                  className="w-full border border-white/15 bg-white/5 text-white rounded-lg px-3 py-2 focus:border-amber-300 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Value
                </label>
                <input
                  type="number"
                  value={editingRow.value}
                  onChange={(e) =>
                    setEditingRow({ ...editingRow, value: e.target.value })
                  }
                  className="w-full border border-white/15 bg-white/5 text-white rounded-lg px-3 py-2 focus:border-amber-300 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={editingRow.rawData?.category || ""}
                  onChange={(e) =>
                    setEditingRow({
                      ...editingRow,
                      rawData: {
                        ...editingRow.rawData,
                        category: e.target.value,
                      },
                    })
                  }
                  className="w-full border border-white/15 bg-white/5 text-white rounded-lg px-3 py-2 focus:border-amber-300 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3 flex-wrap">
              <button
                onClick={() => setEditingRow(null)}
                className="px-4 py-2 border border-white/20 text-white rounded-lg hover:border-amber-300/60 transition flex items-center gap-2"
              >
                <X size={16} />
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-900 font-semibold rounded-lg hover:shadow-lg transition flex items-center gap-2"
              >
                <Check size={16} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-40 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-y-auto text-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Batch History</h3>
              <button
                onClick={() => setShowHistory(false)}
                className="text-slate-300 hover:text-amber-200"
              >
                <X size={18} />
              </button>
            </div>
            {history.length ? (
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-slate-300">
                  <tr>
                    <th className="py-2 pr-3">Title</th>
                    <th className="py-2 pr-3">Value</th>
                    <th className="py-2 pr-3">Category</th>
                    <th className="py-2 pr-3">Batch</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h._id} className="border-t border-white/10">
                      <td className="py-2 pr-3">{h.title}</td>
                      <td className="py-2 pr-3">{h.value}</td>
                      <td className="py-2 pr-3">
                        {h.rawData?.category || "N/A"}
                      </td>
                      <td className="py-2 pr-3">{h.batchId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-slate-300">No history available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CsvUpload;

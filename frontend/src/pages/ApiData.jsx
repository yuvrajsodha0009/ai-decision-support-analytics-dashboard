import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  Database,
  Package,
  Zap,
  Edit3,
  History,
  Trash2,
  X,
  Check,
} from "lucide-react";

// Currency formatter for Rupees
const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const ApiData = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState("all");
  const [insights, setInsights] = useState(null);
  const [summary, setSummary] = useState(null);
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState([]);
  const [historyRecordId, setHistoryRecordId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    value: "",
    changeReason: "",
  });

  /* ================= FETCH ================= */

  const fetchAllApiData = async () => {
    const res = await axios.get("http://localhost:5000/api/api-data/all");
    setData(res.data);
  };

  const fetchApiBatchData = async (batchId) => {
    const res = await axios.get(
      `http://localhost:5000/api/api-data/batch/${batchId}`
    );
    setData(res.data);
  };

  const fetchBatches = async () => {
    const res = await axios.get("http://localhost:5000/api/api-data/batches");
    setBatches(res.data);
  };

  const fetchSummary = async () => {
    const res = await axios.get("http://localhost:5000/api/api-data/summary");
    setSummary(res.data);
  };

  const fetchInsights = async () => {
    const res = await axios.get(
      "http://localhost:5000/api/api-data/batch-insights"
    );
    setInsights(res.data);
  };

  /* ================= API FETCH ================= */

  const fetchApiData = async () => {
    try {
      setLoading(true);
      const res = await axios.post("http://localhost:5000/api/api-data/fetch");
      setMessage(`New API batch added (${res.data.records} records)`);

      setSelectedBatch("all");
      fetchAllApiData();
      fetchBatches();
      fetchSummary();
      fetchInsights();
    } catch (error) {
      setMessage("Failed to fetch API data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  /* ================= BATCH CHANGE ================= */

  const handleBatchChange = (batchId) => {
    setSelectedBatch(batchId);

    if (batchId === "all") {
      fetchAllApiData();
    } else {
      fetchApiBatchData(batchId);
    }
  };

  /* ================= DELETE ================= */

  const deleteBatch = async () => {
    if (selectedBatch === "all") return;

    const ok = window.confirm("Delete this API batch permanently?");
    if (!ok) return;

    await axios.delete(
      `http://localhost:5000/api/api-data/batch/${selectedBatch}`
    );

    setMessage("API batch deleted");
    setSelectedBatch("all");

    fetchAllApiData();
    fetchBatches();
    fetchInsights();
    fetchSummary();
  };

  const deleteRecord = async (id) => {
    const ok = window.confirm("Delete this record?");
    if (!ok) return;

    await axios.delete(`http://localhost:5000/api/api-data/${id}`);
    setMessage("Record deleted");

    if (selectedBatch === "all") {
      fetchAllApiData();
    } else {
      fetchApiBatchData(selectedBatch);
    }
  };

  const viewHistory = async (id) => {
    const res = await axios.get(
      `http://localhost:5000/api/api-data/${id}/history`
    );
    setHistory(res.data);
    setHistoryRecordId(id);
    setShowHistory(true);
  };

  const rollbackRecord = async (id, version) => {
    if (!id) return;

    await axios.post(
      `http://localhost:5000/api/api-data/${id}/rollback/${version}`
    );
    setMessage("Record rolled back");

    if (selectedBatch === "all") {
      fetchAllApiData();
    } else {
      fetchApiBatchData(selectedBatch);
    }
    setShowHistory(false);
  };

  /* ================= EDITING ================= */

  const startEdit = (record) => {
    setEditingRecord(record._id);
    setEditForm({
      title: record.title,
      value: record.value,
      changeReason: "",
    });
  };

  const cancelEdit = () => {
    setEditingRecord(null);
    setEditForm({ title: "", value: "", changeReason: "" });
  };

  const saveEdit = async () => {
    try {
      await axios.put(`http://localhost:5000/api/api-data/${editingRecord}`, {
        ...editForm,
        changedBy: "user",
      });
      setMessage("Record updated successfully");
      setEditingRecord(null);
      setEditForm({ title: "", value: "", changeReason: "" });

      if (selectedBatch === "all") {
        fetchAllApiData();
      } else {
        fetchApiBatchData(selectedBatch);
      }
      fetchSummary();
      fetchInsights();
    } catch (error) {
      setMessage("Failed to update record");
    }
  };

  /* ================= INIT ================= */

  useEffect(() => {
    fetchAllApiData();
    fetchBatches();
    fetchInsights();
    fetchSummary();
  }, []);

  /* ================= CHART DATA ================= */

  const chartData =
    insights?.batches?.map((b, i) => ({
      name: `Batch ${i + 1}`,
      value: b.totalValue,
      date: new Date(b.fetchedAt).toLocaleString(),
    })) || [];

  return (
    <div className="p-8 min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50">
      {/* Professional Header with Logo */}
      <div className="mb-6 flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <div className="p-4 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-2xl shadow-2xl shadow-cyan-300/40">
            <Database className="text-white" size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-teal-700 to-cyan-600 bg-clip-text text-transparent">
              API Data Management
            </h1>
            <p className="text-slate-600 mt-1">
              Fetch and manage data from external APIs
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-emerald-100 to-cyan-100 text-teal-700 border border-emerald-200 shadow-sm">
          Live dataset
        </span>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-6">
        <div className="rounded-2xl border border-cyan-100 bg-white/80 backdrop-blur shadow-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-cyan-700 font-semibold">
              Total Value
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {formatCurrency(summary?.totalValue ?? 0)}
            </p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-100">
            INR
          </span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur shadow-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
              Batches
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {batches.length}
            </p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {selectedBatch === "all" ? "All" : "Filtered"}
          </span>
        </div>
        <div className="rounded-2xl border border-teal-100 bg-gradient-to-r from-cyan-50 to-emerald-50 shadow-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-teal-700 font-semibold">
              Records
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {data.length}
            </p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-white text-teal-700 border border-teal-100">
            Live
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchApiData}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap size={20} />
            {loading ? "Fetching..." : "Fetch API Data"}
          </button>
          <button
            onClick={() => {
              fetchAllApiData();
              fetchBatches();
              fetchSummary();
              fetchInsights();
              setSelectedBatch("all");
              setMessage("Data refreshed successfully");
            }}
            className="px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold shadow-sm hover:border-cyan-200 hover:text-cyan-700 transition flex items-center gap-2"
          >
            Refresh Data
          </button>
        </div>
        <button
          onClick={() => navigate("/csv-upload")}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-semibold shadow-md hover:shadow-lg transition flex items-center gap-2"
        >
          CSV Uploads Hub
        </button>
      </div>

      {/* CSV Upload Usage CTA */}
      <div className="mb-6 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 shadow-md p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-indigo-600 font-semibold">
            Need CSV data?
          </p>
          <p className="text-sm text-slate-600 max-w-2xl">
            Upload spreadsheets, inspect versions, and roll back changes
            directly from the CSV Upload workspace.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => navigate("/csv-upload")}
            className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-semibold shadow hover:shadow-md transition"
          >
            Go to CSV Uploads
          </button>
          <button
            onClick={() => navigate("/csv-upload")}
            className="px-4 py-2 rounded-lg border border-indigo-200 bg-white text-indigo-600 text-sm font-semibold hover:border-indigo-300 transition"
          >
            View CSV History
          </button>
        </div>
      </div>

      {message && (
        <p className="mb-6 text-sm text-slate-800 bg-cyan-100 border border-cyan-200 px-4 py-3 rounded-lg shadow-sm">
          {message}
        </p>
      )}

      {/* ================= API DSS SUMMARY CARD ================= */}
      {summary && insights && insights.batches?.length > 0 && (
        <div className="bg-gradient-to-r from-cyan-600 to-emerald-500 text-white p-6 rounded-xl shadow-lg mb-8 border border-cyan-700/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-white/10">
                <Database className="text-white" size={22} />
              </div>
              <div>
                <h3 className="text-xl font-bold">API Decision Support</h3>
                <p className="text-sm text-cyan-100">
                  Actionable batch insights
                </p>
              </div>
            </div>
            <div className="text-sm text-cyan-100">
              Total records: {summary.totalRecords ?? "n/a"}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 p-4 rounded-lg">
              <p className="text-xs text-cyan-100 uppercase font-semibold">
                Total API Value
              </p>
              <p className="mt-2 text-lg font-bold">
                {formatCurrency(summary.totalValue ?? 0)}
              </p>
            </div>

            <div className="bg-white/10 p-4 rounded-lg">
              <p className="text-xs text-cyan-100 uppercase font-semibold">
                Best Batch
              </p>
              {(() => {
                const sorted = [...insights.batches].sort(
                  (a, b) => b.totalValue - a.totalValue
                );
                const best = sorted[0];
                return (
                  <p className="mt-2 text-lg font-bold">
                    Batch{" "}
                    {insights.batches.findIndex((b) => b._id === best._id) + 1}
                  </p>
                );
              })()}
            </div>

            <div className="bg-white/10 p-4 rounded-lg">
              <p className="text-xs text-cyan-100 uppercase font-semibold">
                Worst Batch
              </p>
              {(() => {
                const sorted = [...insights.batches].sort(
                  (a, b) => b.totalValue - a.totalValue
                );
                const worst = sorted[sorted.length - 1];
                return (
                  <p className="mt-2 text-lg font-bold">
                    Batch{" "}
                    {insights.batches.findIndex((b) => b._id === worst._id) + 1}
                  </p>
                );
              })()}
            </div>
          </div>

          <div className="mt-4 p-3 bg-white/10 rounded-lg text-sm text-cyan-50">
            <div>
              <strong>Trend:</strong> {insights.trend}
            </div>
            <div className="mt-2">
              <strong>Recommendation:</strong> {insights.recommendation}
            </div>
          </div>
        </div>
      )}

      {/* ================= CHART ================= */}
      <div className="bg-white/90 backdrop-blur rounded-xl shadow-lg border border-slate-200 p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">API Batch Trend Analysis</h2>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(v) => `Value: ${v}`}
                labelFormatter={(l, p) => `${l} (${p?.[0]?.payload?.date})`}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#6366f1"
                strokeWidth={3}
                dot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ================= FILTER + DELETE ================= */}
      <div className="flex flex-wrap gap-4 mb-6">
        <select
          value={selectedBatch}
          onChange={(e) => handleBatchChange(e.target.value)}
          className="px-4 py-2 rounded-lg border border-slate-300 bg-white shadow-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <option value="all">All Batches</option>
          {batches.map((b) => (
            <option key={b._id} value={b._id}>
              {new Date(b.fetchedAt).toLocaleString()}
            </option>
          ))}
        </select>

        {selectedBatch !== "all" && (
          <button
            onClick={deleteBatch}
            className="px-4 py-2 bg-rose-500 text-white rounded-lg shadow-sm hover:bg-rose-600 transition"
          >
            Delete Selected Batch
          </button>
        )}
      </div>

      {/* ================= TABLE ================= */}
      <div className="bg-white/95 backdrop-blur rounded-3xl shadow-[0_25px_60px_-25px_rgba(15,23,42,0.35)] border border-slate-200/80 overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 bg-gradient-to-r from-white via-cyan-50 to-white">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              API Data Records
            </h2>
            <p className="text-sm text-slate-500">
              Live database view of fetched batches
            </p>
          </div>
          <div className="text-xs px-3 py-1 rounded-full bg-cyan-100 text-cyan-700 font-semibold border border-cyan-200">
            {data.length} records
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gradient-to-r from-cyan-50 to-teal-50 text-slate-700 border-y border-slate-200 uppercase text-[11px] tracking-wide">
                <th className="p-3 text-left font-semibold">#</th>
                <th className="p-3 text-left font-semibold">Title</th>
                <th className="p-3 text-right font-semibold">Value</th>
                <th className="p-3 text-left font-semibold">Version</th>
                <th className="p-3 text-left font-semibold">Fetched At</th>
                <th className="p-3 text-left font-semibold w-52">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr
                  key={row._id}
                  className={`${
                    i % 2 === 0 ? "bg-white" : "bg-slate-50"
                  } border-b border-slate-100 hover:bg-cyan-50/60 transition-colors`}
                >
                  <td className="p-3 text-slate-600 font-semibold">{i + 1}</td>
                  <td className="p-3 text-slate-900">
                    {editingRecord === row._id ? (
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) =>
                          setEditForm({ ...editForm, title: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    ) : (
                      row.title
                    )}
                  </td>
                  <td className="p-3 text-right text-slate-900">
                    {editingRecord === row._id ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.value}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            value: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    ) : (
                      row.value.toFixed(2)
                    )}
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                      <Package size={14} /> v{row.version}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-slate-700">
                    {new Date(row.fetchedAt).toLocaleString()}
                  </td>
                  <td className="p-3">
                    {editingRecord === row._id ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={saveEdit}
                            className="px-3 py-2 bg-emerald-500 text-white text-xs rounded-lg shadow-sm hover:bg-emerald-600 transition flex items-center gap-1"
                          >
                            <Check size={14} /> Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-3 py-2 bg-slate-200 text-slate-800 text-xs rounded-lg hover:bg-slate-300 transition"
                          >
                            <X size={14} /> Cancel
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Change reason"
                          value={editForm.changeReason}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              changeReason: e.target.value,
                            })
                          }
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>
                    ) : (
                      <div className="flex gap-2 items-center">
                        <button
                          onClick={() => startEdit(row)}
                          className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-1.5 font-medium"
                        >
                          <Edit3 size={13} /> Edit
                        </button>
                        <button
                          onClick={() => viewHistory(row._id)}
                          className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-1.5 font-medium"
                        >
                          <History size={13} /> History
                        </button>
                        <button
                          onClick={() => deleteRecord(row._id)}
                          className="px-3 py-1.5 bg-gradient-to-r from-rose-500 to-red-500 text-white text-xs rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-1.5 font-medium"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.length === 0 && (
          <p className="text-sm text-slate-400 px-6 py-4">
            No API data for selected batch.
          </p>
        )}
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[72vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-white via-indigo-50 to-white">
              <h3 className="text-lg font-semibold text-slate-900">
                Version History
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  {history.length} entries
                </span>
                <button
                  onClick={() => setShowHistory(false)}
                  className="px-3 py-1.5 text-sm rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="overflow-auto max-h-[calc(72vh-64px)]">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] tracking-wide">
                  <tr>
                    <th className="p-2 text-left">Version</th>
                    <th className="p-2 text-left">Title</th>
                    <th className="p-2 text-right">Value</th>
                    <th className="p-2 text-left">Changed At</th>
                    <th className="p-2 text-left">Change Type</th>
                    <th className="p-2 text-left">Reason</th>
                    <th className="p-2 text-left w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr
                      key={h._id}
                      className="border-b last:border-0 hover:bg-indigo-50/40"
                    >
                      <td className="p-2 font-semibold text-slate-800">
                        {h.version}
                      </td>
                      <td className="p-2">{h.title}</td>
                      <td className="p-2 text-right">{h.value}</td>
                      <td className="p-2 text-slate-700">
                        {new Date(h.changedAt || h.fetchedAt).toLocaleString()}
                      </td>
                      <td className="p-2">{h.changeType}</td>
                      <td className="p-2 text-slate-600">{h.changeReason}</td>
                      <td className="p-2">
                        <button
                          onClick={() =>
                            rollbackRecord(historyRecordId, h.version)
                          }
                          className="px-2.5 py-1 bg-indigo-500 text-white text-xs rounded-lg shadow-sm hover:bg-indigo-600 transition"
                        >
                          Rollback
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiData;

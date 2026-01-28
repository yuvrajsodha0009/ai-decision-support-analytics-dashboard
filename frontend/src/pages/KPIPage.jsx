import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Target,
  TrendingUp,
  Trash2,
  BarChart3,
  Plus,
  Filter,
  Database,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";

const API_URL = "http://localhost:5000/api/kpis";

const KPIPage = () => {
  const [name, setName] = useState("");
  const [source, setSource] = useState("csv");
  const [field, setField] = useState("value");
  const [operation, setOperation] = useState("SUM");
  const [batch, setBatch] = useState("ALL");
  const [batchOptions, setBatchOptions] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [filterSource, setFilterSource] = useState("all");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  /* ================= FETCH BATCH OPTIONS ================= */
  useEffect(() => {
    if (source === "database") {
      setBatchOptions([]);
      setBatch("ALL");
      return;
    }

    axios
      .get(`${API_URL}/batches?source=${source}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setBatchOptions(res.data))
      .catch((error) => {
        console.error("Failed to fetch batches:", error);
        setBatchOptions([{ label: "All Batches", value: "ALL" }]);
      });
  }, [source, token]);

  /* ================= FETCH KPIs ================= */
  const fetchKPIs = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/compute`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setKpis(res.data);
    } catch (error) {
      console.error("Failed to fetch KPIs:", error);
      setKpis([]);
    } finally {
      setLoading(false);
    }
  };

  /* ================= CREATE KPI ================= */
  const createKPI = async (e) => {
    e.preventDefault();

    try {
      // 🔒 FORCE correct field for CSV & API
      const finalField = source === "database" ? field : "value";

      await axios.post(
        API_URL,
        {
          name,
          source,
          field: finalField,
          operation,
          batchId: batch,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setName("");
      setBatch("ALL");
      fetchKPIs();
    } catch (error) {
      console.error("Failed to create KPI:", error);
      alert("Failed to create KPI. Please try again.");
    }
  };

  /* ================= DELETE KPI ================= */
  const deleteKPI = async (id) => {
    if (!window.confirm("Delete this KPI?")) return;

    try {
      await axios.delete(`${API_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      fetchKPIs();
    } catch (error) {
      console.error("Failed to delete KPI:", error);
      alert("Failed to delete KPI. Please try again.");
    }
  };

  useEffect(() => {
    fetchKPIs();
  }, []);

  return (
    <div className="p-8 bg-slate-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Professional Header with Logo */}
        <div className="mb-8 flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl shadow-xl">
            <Target className="text-white" size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Key Performance Indicators
            </h1>
            <p className="text-slate-400 mt-1">
              Define and track your custom KPIs across all data sources
            </p>
          </div>
        </div>

        {/* Enhanced KPI Form */}
        <form
          onSubmit={createKPI}
          className="bg-white p-8 rounded-2xl shadow-xl mb-8 border border-slate-100"
        >
          <div className="flex items-center gap-2 mb-6">
            <Plus size={24} className="text-purple-600" />
            <h2 className="text-xl font-semibold text-slate-900">
              Create New KPI
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                KPI Name
              </label>
              <input
                className="w-full border-2 border-slate-300 p-3 rounded-xl focus:border-purple-500 focus:outline-none transition-colors font-medium"
                placeholder="e.g., Total Sales Revenue"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Data Source
              </label>
              <select
                className="w-full border-2 border-slate-300 p-3 rounded-xl focus:border-purple-500 focus:outline-none transition-colors font-medium"
                value={source}
                onChange={(e) => {
                  const selectedSource = e.target.value;
                  setSource(selectedSource);
                  setField(selectedSource === "database" ? "revenue" : "value");
                }}
              >
                <option value="csv">CSV Data</option>
                <option value="api"> API Data</option>
                <option value="database"> Database</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Field
              </label>
              {source === "database" ? (
                <select
                  className="w-full border-2 border-slate-300 p-3 rounded-xl focus:border-purple-500 focus:outline-none transition-colors font-medium"
                  value={field}
                  onChange={(e) => setField(e.target.value)}
                >
                  <option value="revenue">Revenue</option>
                  <option value="quantity">Quantity</option>
                </select>
              ) : (
                <input
                  type="text"
                  value="value"
                  readOnly
                  className="w-full border-2 border-slate-200 p-3 rounded-xl bg-slate-50 text-slate-500 font-medium cursor-not-allowed"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Operation
              </label>
              <select
                className="w-full border-2 border-slate-300 p-3 rounded-xl focus:border-purple-500 focus:outline-none transition-colors font-medium"
                value={operation}
                onChange={(e) => setOperation(e.target.value)}
              >
                <option>SUM</option>
                <option>AVG</option>
                <option>MIN</option>
                <option>MAX</option>
                <option>COUNT</option>
              </select>
            </div>

            {source !== "database" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Batch Selection
                </label>
                <select
                  className="w-full border-2 border-slate-300 p-3 rounded-xl focus:border-purple-500 focus:outline-none transition-colors font-medium"
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                >
                  {batchOptions.map((b, i) => (
                    <option key={i} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <button className="mt-6 w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2">
            <Plus size={20} />
            Create KPI
          </button>
        </form>

        {/* Enhanced Filter Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">KPI Dashboard</h2>
            <p className="text-sm text-slate-600 mt-1">
              Monitor your key performance metrics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-slate-600" />
            <select
              className="border-2 border-slate-300 px-4 py-2 rounded-xl focus:border-purple-500 focus:outline-none transition-colors font-medium bg-white"
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
            >
              <option value="all">All Sources</option>
              <option value="csv">📊 CSV</option>
              <option value="api">🔌 API</option>
              <option value="database">💾 Database</option>
            </select>
          </div>
        </div>

        {/* Enhanced KPI Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
              <p className="text-slate-600 font-medium">Loading KPIs...</p>
            </div>
          </div>
        ) : kpis.filter((kpi) =>
            filterSource === "all" ? true : kpi.source === filterSource
          ).length === 0 ? (
          <div className="bg-white p-12 rounded-2xl shadow-xl text-center border border-slate-100">
            <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              No KPIs Yet
            </h3>
            <p className="text-slate-600">
              Create your first KPI to start tracking your metrics
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {kpis
              .filter((kpi) =>
                filterSource === "all" ? true : kpi.source === filterSource
              )
              .map((kpi) => {
                const sourceColors = {
                  csv: {
                    bg: "from-orange-500 to-amber-500",
                    icon: FileSpreadsheet,
                    badge: "bg-orange-100 text-orange-700",
                  },
                  api: {
                    bg: "from-blue-500 to-indigo-500",
                    icon: Database,
                    badge: "bg-blue-100 text-blue-700",
                  },
                  database: {
                    bg: "from-purple-500 to-indigo-500",
                    icon: BarChart3,
                    badge: "bg-purple-100 text-purple-700",
                  },
                };
                const config = sourceColors[kpi.source] || sourceColors.csv;
                const IconComponent = config.icon;

                return (
                  <div
                    key={kpi._id}
                    className="group relative bg-white p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-100 overflow-hidden"
                  >
                    {/* Decorative gradient background */}
                    <div
                      className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${config.bg} opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500`}
                    ></div>

                    {/* Delete button */}
                    <button
                      onClick={() => deleteKPI(kpi._id)}
                      className="absolute top-3 right-3 p-2 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-all duration-200 z-10"
                      title="Delete KPI"
                    >
                      <Trash2 size={18} />
                    </button>

                    {/* Source badge */}
                    <div className="relative mb-4">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold uppercase ${config.badge}`}
                      >
                        <IconComponent size={12} />
                        {kpi.source}
                      </span>
                    </div>

                    {/* KPI Name */}
                    <h3 className="relative text-lg font-bold text-slate-900 mb-3 pr-8">
                      {kpi.name}
                    </h3>

                    {/* KPI Value */}
                    <div className="relative flex items-baseline gap-2 mb-4">
                      <p
                        className={`text-4xl font-extrabold bg-gradient-to-r ${config.bg} bg-clip-text text-transparent`}
                      >
                        {typeof kpi.value === "number"
                          ? kpi.value.toLocaleString()
                          : kpi.value}
                      </p>
                      <TrendingUp className={`text-green-500`} size={24} />
                    </div>

                    {/* KPI Details */}
                    <div className="relative space-y-2 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 font-medium">
                          Field:
                        </span>
                        <span className="text-slate-900 font-semibold">
                          {kpi.field}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 font-medium">
                          Operation:
                        </span>
                        <span
                          className={`px-2 py-1 rounded-lg text-xs font-bold ${config.badge}`}
                        >
                          {kpi.operation}
                        </span>
                      </div>
                      {kpi.batchId && kpi.batchId !== "ALL" && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500 font-medium">
                            Batch:
                          </span>
                          <span className="text-slate-900 font-semibold text-xs">
                            {kpi.batchId}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};

export default KPIPage;

import { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  IndianRupee,
  Package,
  ShoppingBag,
  TrendingUp,
  Award,
  AlertCircle,
  Clock,
  Edit3,
  History,
  Trash2,
  ChevronDown,
} from "lucide-react";

const API_BASE = "http://localhost:5000/api";

// Currency formatter
const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const Dashboard = () => {
  const [sales, setSales] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [insights, setInsights] = useState(null); // ✅ DSS state
  const [editingRecord, setEditingRecord] = useState(null);
  const [timePeriod, setTimePeriod] = useState("month");
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const [editForm, setEditForm] = useState({
    product: "",
    quantity: "",
    revenue: "",
    changeReason: "",
  });
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchSales();
    fetchTotalRevenue();
    fetchInsights(); // ✅ DSS call
  }, []);

  const fetchSales = async () => {
    try {
      const res = await axios.get(`${API_BASE}/sales`);
      setSales(res.data);
    } catch (err) {
      console.error("Failed to load sales data", err);
    }
  };

  const fetchTotalRevenue = async () => {
    try {
      const res = await axios.get(`${API_BASE}/sales/total-revenue`);
      setTotalRevenue(res.data.totalRevenue);
    } catch (err) {
      console.error("Failed to load total revenue", err);
    }
  };

  // ✅ DSS API
  const fetchInsights = async () => {
    try {
      const res = await axios.get(`${API_BASE}/sales/insights`);
      setInsights(res.data);
    } catch (err) {
      console.error("Failed to load insights");
    }
  };

  /* ================= EDITING ================= */

  const startEdit = (record) => {
    setEditingRecord(record._id);
    setEditForm({
      product: record.product,
      quantity: record.quantity,
      revenue: record.revenue,
      changeReason: "",
    });
  };

  const cancelEdit = () => {
    setEditingRecord(null);
    setEditForm({ product: "", quantity: "", revenue: "", changeReason: "" });
  };

  const saveEdit = async () => {
    try {
      await axios.put(`http://localhost:5000/api/sales/${editingRecord}`, {
        ...editForm,
        changedBy: "user",
      });
      setEditingRecord(null);
      setEditForm({ product: "", quantity: "", revenue: "", changeReason: "" });

      fetchSales();
      fetchTotalRevenue();
      fetchInsights();
    } catch (error) {
      console.error("Failed to update record");
    }
  };

  const viewHistory = async (id) => {
    const res = await axios.get(
      `http://localhost:5000/api/sales/${id}/history`,
    );
    setHistory(res.data);
    setShowHistory(true);
  };

  const rollbackRecord = async (id, version) => {
    await axios.post(
      `http://localhost:5000/api/sales/${id}/rollback/${version}`,
    );
    fetchSales();
    fetchTotalRevenue();
    fetchInsights();
    setShowHistory(false);
  };

  const deleteRecord = async (id) => {
    const ok = window.confirm("Delete this record?");
    if (!ok) return;

    await axios.delete(`http://localhost:5000/api/sales/${id}`);
    fetchSales();
    fetchTotalRevenue();
    fetchInsights();
  };

  const totalQuantity = sales.reduce((sum, item) => sum + item.quantity, 0);
  const activeProducts = new Set(sales.map((item) => item.product)).size;

  // Aggregate sales by product for charting
  const aggregatedSales = sales.reduce((acc, item) => {
    const name = item.product || "Unknown";
    const revenue = Number(item.revenue || 0) || 0;
    const existing = acc.find((c) => c.product === name);
    if (existing) existing.revenue += revenue;
    else acc.push({ product: name, revenue });
    return acc;
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent mb-2">
          Sales Dashboard
        </h1>
        <p className="text-slate-400">
          Monitor your sales performance and key metrics
        </p>
      </div>

      {/* Stats Cards with Enhanced Design */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="group relative bg-white p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-100 overflow-hidden animate-fadeIn stagger-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative flex items-center gap-4">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
              <IndianRupee className="text-white" size={24} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-500 mb-1">
                Total Revenue
              </p>
              <h2 className="text-2xl font-bold text-slate-900">
                {formatCurrency(totalRevenue)}
              </h2>
              <div className="flex items-center gap-1 mt-2 text-green-600 text-xs font-semibold">
                <TrendingUp size={14} />
                <span>+12.5% from last month</span>
              </div>
            </div>
          </div>
        </div>

        <div className="group relative bg-white p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-100 overflow-hidden animate-fadeIn stagger-2">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
              <ShoppingBag className="text-white" size={24} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-500 mb-1">
                Units Sold
              </p>
              <h2 className="text-2xl font-bold text-slate-900">
                {totalQuantity}
              </h2>
              <div className="flex items-center gap-1 mt-2 text-blue-600 text-xs font-semibold">
                <TrendingUp size={14} />
                <span>+8.2% from last week</span>
              </div>
            </div>
          </div>
        </div>

        <div className="group relative bg-white p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-100 overflow-hidden animate-fadeIn stagger-3">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative flex items-center gap-4">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Package className="text-white" size={24} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-500 mb-1">
                Active Products
              </p>
              <h2 className="text-2xl font-bold text-slate-900">
                {activeProducts}
              </h2>
              <div className="flex items-center gap-1 mt-2 text-emerald-600 text-xs font-semibold">
                <Package size={14} />
                <span>All products active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section with Enhanced Design */}
      <div className="bg-white p-8 rounded-2xl shadow-xl mb-8 border border-slate-100 animate-fadeIn stagger-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">
              Revenue by Product
            </h2>
            <p className="text-sm text-slate-500">
              Performance breakdown across all products
            </p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowPeriodMenu(!showPeriodMenu)}
              className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors duration-200 flex items-center gap-2"
            >
              {timePeriod === "month" && "This Month"}
              {timePeriod === "quarter" && "This Quarter"}
              {timePeriod === "year" && "This Year"}
              <ChevronDown size={16} />
            </button>

            {/* Dropdown Menu */}
            {showPeriodMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-10">
                <button
                  onClick={() => {
                    setTimePeriod("month");
                    setShowPeriodMenu(false);
                  }}
                  className={`w-full px-4 py-3 text-left text-sm font-medium hover:bg-indigo-50 transition-colors ${
                    timePeriod === "month"
                      ? "text-indigo-600 bg-indigo-50"
                      : "text-slate-700"
                  }`}
                >
                  This Month
                </button>
                <button
                  onClick={() => {
                    setTimePeriod("quarter");
                    setShowPeriodMenu(false);
                  }}
                  className={`w-full px-4 py-3 text-left text-sm font-medium hover:bg-indigo-50 transition-colors border-t border-slate-200 ${
                    timePeriod === "quarter"
                      ? "text-indigo-600 bg-indigo-50"
                      : "text-slate-700"
                  }`}
                >
                  This Quarter
                </button>
                <button
                  onClick={() => {
                    setTimePeriod("year");
                    setShowPeriodMenu(false);
                  }}
                  className={`w-full px-4 py-3 text-left text-sm font-medium hover:bg-indigo-50 transition-colors border-t border-slate-200 ${
                    timePeriod === "year"
                      ? "text-indigo-600 bg-indigo-50"
                      : "text-slate-700"
                  }`}
                >
                  This Year
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={aggregatedSales}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.9} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="product"
                tick={{ fill: "#64748b", fontSize: 14, fontWeight: 500 }}
                axisLine={{ stroke: "#cbd5e1" }}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 14 }}
                axisLine={{ stroke: "#cbd5e1" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "none",
                  borderRadius: "12px",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
                  padding: "12px 16px",
                }}
                labelStyle={{
                  color: "#f1f5f9",
                  fontWeight: 600,
                  marginBottom: "4px",
                }}
                itemStyle={{ color: "#e0e7ff" }}
                formatter={(value) => formatCurrency(value)}
              />
              <Bar
                dataKey="revenue"
                fill="url(#colorRevenue)"
                radius={[12, 12, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Enhanced DSS INSIGHTS SECTION */}
      {insights && (
        <div className="bg-gradient-to-br from-indigo-700 to-purple-600 text-white p-6 rounded-2xl shadow-xl mb-8 border border-indigo-600/20 animate-fadeIn">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/10 flex items-center justify-center">
              <Award className="text-white" size={26} />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">Decision Support Insights</h2>
              <p className="text-sm text-indigo-100">
                AI-driven recommendations and highlights
              </p>
            </div>
            <div className="text-sm text-indigo-100">&nbsp;</div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 p-4 rounded-lg">
              <p className="text-xs text-indigo-100 uppercase font-semibold">
                Best Performing
              </p>
              <p className="mt-2 text-lg font-bold text-white">
                {insights.bestProduct}
              </p>
            </div>

            <div className="bg-white/10 p-4 rounded-lg">
              <p className="text-xs text-indigo-100 uppercase font-semibold">
                Needs Attention
              </p>
              <p className="mt-2 text-lg font-bold text-white">
                {insights.worstProduct}
              </p>
            </div>

            <div className="bg-white/10 p-4 rounded-lg flex flex-col justify-between">
              <p className="text-xs text-indigo-100 uppercase font-semibold">
                Recommendation
              </p>
              <p className="mt-2 text-sm text-indigo-50">
                {insights.recommendation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Table */}
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 animate-fadeIn stagger-1">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">
            Sales Records
          </h2>
          <p className="text-sm text-slate-500">
            Manage and track all sales transactions
          </p>
        </div>
        <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-indigo-50 text-left border-b-2 border-indigo-200">
                <th className="p-4 font-semibold text-slate-700">Product</th>
                <th className="p-4 text-right font-semibold text-slate-700">
                  Quantity
                </th>
                <th className="p-4 text-right font-semibold text-slate-700">
                  Revenue
                </th>
                <th className="p-4 font-semibold text-slate-700">Version</th>
                <th className="p-4 w-48 font-semibold text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sales.map((item, index) => (
                <tr
                  key={item._id || index}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors duration-150"
                >
                  <td className="p-4 font-medium text-slate-900">
                    {editingRecord === item._id ? (
                      <input
                        type="text"
                        value={editForm.product}
                        onChange={(e) =>
                          setEditForm({ ...editForm, product: e.target.value })
                        }
                        className="border-2 border-indigo-300 rounded-lg p-2 w-full focus:border-indigo-500 focus:outline-none transition-colors"
                      />
                    ) : (
                      item.product
                    )}
                  </td>
                  <td className="p-4 text-right text-slate-700">
                    {editingRecord === item._id ? (
                      <input
                        type="number"
                        value={editForm.quantity}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            quantity: parseInt(e.target.value) || 0,
                          })
                        }
                        className="border-2 border-indigo-300 rounded-lg p-2 w-full text-right focus:border-indigo-500 focus:outline-none transition-colors"
                      />
                    ) : (
                      item.quantity
                    )}
                  </td>
                  <td className="p-4 text-right font-semibold text-slate-900">
                    {editingRecord === item._id ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.revenue}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            revenue: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="border-2 border-indigo-300 rounded-lg p-2 w-full text-right focus:border-indigo-500 focus:outline-none transition-colors"
                      />
                    ) : (
                      formatCurrency(item.revenue)
                    )}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                      v{item.version}
                    </span>
                  </td>
                  <td className="p-4">
                    {editingRecord === item._id ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <button
                            onClick={saveEdit}
                            className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="flex-1 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm"
                          >
                            Cancel
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
                          className="border-2 border-slate-300 rounded-lg p-2 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                        />
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(item)}
                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                          title="Edit"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => viewHistory(item._id)}
                          className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                          title="History"
                        >
                          <History size={16} />
                        </button>
                        <button
                          onClick={() => deleteRecord(item._id)}
                          className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enhanced History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Clock className="text-purple-600" size={24} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">
                  Version History
                </h3>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <span className="text-2xl text-slate-400 hover:text-slate-600">
                  ×
                </span>
              </button>
            </div>
            <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
              <table className="w-full border-collapse">
                <thead className="bg-gradient-to-r from-slate-50 to-purple-50">
                  <tr className="border-b-2 border-purple-200">
                    <th className="p-3 text-left font-semibold text-slate-700">
                      Version
                    </th>
                    <th className="p-3 text-left font-semibold text-slate-700">
                      Product
                    </th>
                    <th className="p-3 text-right font-semibold text-slate-700">
                      Quantity
                    </th>
                    <th className="p-3 text-right font-semibold text-slate-700">
                      Revenue
                    </th>
                    <th className="p-3 text-left font-semibold text-slate-700">
                      Changed At
                    </th>
                    <th className="p-3 text-left font-semibold text-slate-700">
                      Change Type
                    </th>
                    <th className="p-3 text-left font-semibold text-slate-700">
                      Reason
                    </th>
                    <th className="p-3 w-24 text-left font-semibold text-slate-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr
                      key={h._id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                          v{h.version}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-slate-900">
                        {h.product}
                      </td>
                      <td className="p-3 text-right text-slate-700">
                        {h.quantity}
                      </td>
                      <td className="p-3 text-right font-semibold text-slate-900">
                        {formatCurrency(h.revenue)}
                      </td>
                      <td className="p-3 text-sm text-slate-600">
                        {new Date(h.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                          {h.changeType}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-slate-600">
                        {h.changeReason}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => rollbackRecord(h.salesId, h.version)}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors duration-200 shadow-sm"
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

export default Dashboard;

import { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Calendar,
} from "lucide-react";

// Currency formatter for Rupees
const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const COLORS = [
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
];

const SalesPage = () => {
  const [salesData, setSalesData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  useEffect(() => {
    fetchSalesData();
  }, []);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:5000/api/sales/all");
      setSalesData(res.data);
      calculateSummary(res.data);
    } catch (error) {
      console.error("Failed to fetch sales data", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (data) => {
    const total = data.reduce((sum, item) => sum + (item.revenue || 0), 0);
    const avgOrder = data.length > 0 ? total / data.length : 0;
    const productCounts = {};

    data.forEach((item) => {
      if (item.product) {
        productCounts[item.product] = (productCounts[item.product] || 0) + 1;
      }
    });

    const topProduct = Object.keys(productCounts).reduce(
      (a, b) => (productCounts[a] > productCounts[b] ? a : b),
      Object.keys(productCounts)[0] || "N/A",
    );

    setSummary({
      totalRevenue: total,
      totalOrders: data.length,
      avgOrderValue: avgOrder,
      topProduct,
    });
  };

  // Aggregate sales by product and take top 10 by revenue
  const aggregatedByProduct = salesData.reduce((acc, item) => {
    const name = item.product || "Unknown";
    const amount = Number(item.revenue || 0) || 0;
    const quantity = Number(item.quantity || 0) || 0;
    const existing = acc.find((c) => c.name === name);
    if (existing) {
      existing.amount += amount;
      existing.quantity += quantity;
    } else {
      acc.push({ name, amount, quantity });
    }
    return acc;
  }, []);

  const chartData = aggregatedByProduct
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  const categoryData = salesData.reduce((acc, item) => {
    const category = item.channel || "Other";
    const existing = acc.find((c) => c.name === category);
    if (existing) {
      existing.value += item.revenue || 0;
    } else {
      acc.push({ name: category, value: item.revenue || 0 });
    }
    return acc;
  }, []);

  return (
    <div className="p-8 min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-teal-50">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl shadow-xl">
            <TrendingUp className="text-white" size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-900">
              Sales Analytics
            </h1>
            <p className="text-slate-600 mt-1">
              Track revenue, orders, and sales performance
            </p>
          </div>
        </div>
        <button
          onClick={fetchSalesData}
          disabled={loading}
          className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh Data"}
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-slate-500 font-semibold">
                  Total Revenue
                </p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {formatCurrency(summary.totalRevenue)}
                </p>
              </div>
              <DollarSign className="text-green-500" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-slate-500 font-semibold">
                  Total Orders
                </p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {summary.totalOrders}
                </p>
              </div>
              <ShoppingCart className="text-cyan-500" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-slate-500 font-semibold">
                  Avg Order Value
                </p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {formatCurrency(summary.avgOrderValue)}
                </p>
              </div>
              <TrendingUp className="text-purple-500" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-slate-500 font-semibold">
                  Top Product
                </p>
                <p className="text-xl font-bold text-slate-900 mt-2">
                  {summary.topProduct}
                </p>
              </div>
              <Users className="text-orange-500" size={40} />
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Bar Chart */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Top Products by Revenue
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  angle={-15}
                  textAnchor="end"
                  height={80}
                  tick={{ fill: "#64748b" }}
                />
                <YAxis tick={{ fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="amount" fill="#06b6d4" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Sales by Category
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {categoryData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            Recent Sales Transactions
          </h2>
        </div>
        <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs uppercase text-slate-600 font-semibold">
                <th className="p-4">#</th>
                <th className="p-4">Product</th>
                <th className="p-4">Channel</th>
                <th className="p-4">Quantity</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {salesData.slice(0, 15).map((item, idx) => (
                <tr
                  key={item._id || idx}
                  className="border-b border-slate-100 hover:bg-slate-50 transition"
                >
                  <td className="p-4 text-slate-600">{idx + 1}</td>
                  <td className="p-4 text-slate-900 font-medium">
                    {item.product || "N/A"}
                  </td>
                  <td className="p-4 text-slate-600">
                    {item.channel || "N/A"}
                  </td>
                  <td className="p-4 text-slate-600">{item.quantity || 0}</td>
                  <td className="p-4 text-green-600 font-semibold">
                    {formatCurrency(item.revenue || 0)}
                  </td>
                  <td className="p-4 text-slate-600 text-sm">
                    {item.date
                      ? new Date(item.date).toLocaleDateString()
                      : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {salesData.length === 0 && (
          <p className="text-center text-slate-500 py-8">
            No sales data available
          </p>
        )}
      </div>
    </div>
  );
};

export default SalesPage;

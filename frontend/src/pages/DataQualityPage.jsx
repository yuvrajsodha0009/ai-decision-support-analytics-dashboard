import { useState } from "react";
import {
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart as PieChartComponent,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const DataQualityPage = () => {
  const [qualityMetrics] = useState({
    overallScore: 94,
    completeness: 98,
    accuracy: 91,
    consistency: 92,
    timeliness: 89,
    validity: 95,
  });

  const datasetQuality = [
    { name: "Sales Data", quality: 96, records: 5200, status: "Excellent" },
    { name: "CSV Uploads", quality: 89, records: 3400, status: "Good" },
    { name: "API Data", quality: 92, records: 8900, status: "Excellent" },
    { name: "Cleaned Data", quality: 99, records: 1200, status: "Excellent" },
  ];

  const issuesData = [
    { name: "Missing Values", value: 3, color: "#ff6b6b" },
    { name: "Duplicates", value: 2, color: "#ffd93d" },
    { name: "Format Issues", value: 5, color: "#ff8c42" },
    { name: "Valid", value: 90, color: "#4caf50" },
  ];

  const qualityTrendData = [
    { month: "Jan", score: 85 },
    { month: "Feb", score: 87 },
    { month: "Mar", score: 89 },
    { month: "Apr", score: 91 },
    { month: "May", score: 93 },
    { month: "Jun", score: 94 },
  ];

  const getScoreColor = (score) => {
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score) => {
    if (score >= 90) return "bg-green-100";
    if (score >= 75) return "bg-yellow-100";
    return "bg-red-100";
  };

  return (
    <div className="p-8 bg-[var(--bg-page)] text-[var(--text-main)] min-h-screen">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="p-4 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl shadow-xl">
          <Zap className="text-white" size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Data Quality Metrics
          </h1>
          <p className="text-slate-400 mt-1">
            Monitor and improve your data quality scores
          </p>
        </div>
      </div>

      {/* Overall Score Card */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-8 rounded-2xl shadow-xl mb-8 animate-fadeIn stagger-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-100 mb-2 font-medium">
              Overall Data Quality Score
            </p>
            <h2 className="text-6xl font-bold mb-2">
              {qualityMetrics.overallScore}%
            </h2>
            <p className="text-emerald-50">
              Your data is in excellent condition. Keep maintaining quality
              standards.
            </p>
          </div>
          <div className="w-32 h-32 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <div className="text-center">
              <CheckCircle className="text-white mx-auto mb-2" size={40} />
              <p className="text-sm font-semibold">Excellent</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quality Dimensions */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {[
          {
            label: "Completeness",
            score: qualityMetrics.completeness,
            icon: "📊",
          },
          { label: "Accuracy", score: qualityMetrics.accuracy, icon: "✓" },
          {
            label: "Consistency",
            score: qualityMetrics.consistency,
            icon: "⚙️",
          },
          { label: "Timeliness", score: qualityMetrics.timeliness, icon: "⏱️" },
          { label: "Validity", score: qualityMetrics.validity, icon: "✅" },
          { label: "Uniqueness", score: 93, icon: "🔑" },
        ].map((metric, idx) => (
          <div
            key={metric.label}
            className={`bg-white p-6 rounded-xl shadow-lg border-l-4 ${
              metric.score >= 90 ? "border-green-500" : "border-yellow-500"
            } animate-fadeIn`}
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl">{metric.icon}</span>
              <span
                className={`text-2xl font-bold ${getScoreColor(metric.score)}`}
              >
                {metric.score}%
              </span>
            </div>
            <p className="font-semibold text-slate-900 mb-2">{metric.label}</p>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full"
                style={{ width: `${metric.score}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Quality Trend */}
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 animate-fadeIn stagger-2">
          <h3 className="text-xl font-bold text-slate-900 mb-6">
            Quality Trend (Last 6 Months)
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={qualityTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="score" fill="#4caf50" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Data Issues Distribution */}
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 animate-fadeIn stagger-3">
          <h3 className="text-xl font-bold text-slate-900 mb-6">
            Data Issues Distribution
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChartComponent>
                <Pie
                  data={issuesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {issuesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChartComponent>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Dataset Quality Details */}
      <div className="surface-card p-8 rounded-2xl shadow-xl animate-fadeIn stagger-4">
        <h3 className="text-2xl font-bold text-[var(--text-main)] mb-6">
          Dataset Quality Details
        </h3>
        <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
          <table className="w-full">
            <thead className="table-head">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">
                  Dataset Name
                </th>
                <th className="px-6 py-4 text-left font-semibold">
                  Quality Score
                </th>
                <th className="px-6 py-4 text-left font-semibold">Records</th>
                <th className="px-6 py-4 text-left font-semibold">Status</th>
                <th className="px-6 py-4 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {datasetQuality.map((dataset, idx) => (
                <tr
                  key={dataset.name}
                  className="table-row table-row-hover transition-colors animate-fadeIn"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <td className="px-6 py-4 font-semibold text-[var(--text-main)]">
                    {dataset.name}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-slate-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            dataset.quality >= 90
                              ? "bg-green-500"
                              : "bg-yellow-500"
                          }`}
                          style={{ width: `${dataset.quality}%` }}
                        ></div>
                      </div>
                      <span
                        className={`font-bold text-lg ${getScoreColor(
                          dataset.quality
                        )}`}
                      >
                        {dataset.quality}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                    {dataset.records.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        dataset.status === "Excellent"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {dataset.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-blue-600 hover:text-blue-700 font-medium">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations */}
      <div className="mt-8 surface-card rounded-2xl p-8 animate-slideInLeft">
        <div className="flex items-start gap-4">
          <TrendingUp className="text-blue-600 flex-shrink-0 mt-1" size={24} />
          <div>
            <h4 className="font-bold text-[var(--text-main)] mb-2">
              Recommendations to Improve Quality
            </h4>
            <ul className="space-y-2 text-slate-700 dark:text-slate-300">
              <li>
                • Continue data validation at the point of entry to maintain
                95%+ accuracy
              </li>
              <li>
                • Schedule weekly data quality audits to catch issues early
              </li>
              <li>
                • Implement automated duplicate detection for API data feeds
              </li>
              <li>
                • Set up alerts for datasets that drop below 85% quality score
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataQualityPage;

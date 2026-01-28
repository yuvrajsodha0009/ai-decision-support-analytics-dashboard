import { useState, useEffect } from "react";
import {
  Activity,
  Trash2,
  Download,
  Filter,
  User,
  Clock,
  CheckCircle2,
} from "lucide-react";

const ActivityLogPage = () => {
  const [logs, setLogs] = useState([
    {
      id: 1,
      action: "Dashboard Viewed",
      user: "You",
      time: "2 mins ago",
      status: "success",
      details: "Sales Dashboard accessed",
    },
    {
      id: 2,
      action: "CSV Uploaded",
      user: "You",
      time: "15 mins ago",
      status: "success",
      details: "Uploaded sales_data.csv with 500 records",
    },
    {
      id: 3,
      action: "KPI Created",
      user: "You",
      time: "1 hour ago",
      status: "success",
      details: "New KPI: Monthly Revenue Target",
    },
    {
      id: 4,
      action: "Report Exported",
      user: "You",
      time: "2 hours ago",
      status: "success",
      details: "PDF report generated and downloaded",
    },
    {
      id: 5,
      action: "Data Cleaned",
      user: "You",
      time: "3 hours ago",
      status: "success",
      details: "Cleaned dataset with 1,200 rows",
    },
    {
      id: 6,
      action: "API Data Fetched",
      user: "You",
      time: "5 hours ago",
      status: "success",
      details: "Fetched 850 records from API",
    },
    {
      id: 7,
      action: "Settings Updated",
      user: "You",
      time: "1 day ago",
      status: "success",
      details: "Notification preferences changed",
    },
    {
      id: 8,
      action: "Data Deleted",
      user: "You",
      time: "2 days ago",
      status: "warning",
      details: "Deleted old batch: Batch #12",
    },
  ]);

  const [filteredLogs, setFilteredLogs] = useState(logs);
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let filtered = logs;

    if (filterType !== "all") {
      filtered = filtered.filter((log) => log.status === filterType);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (log) =>
          log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.details.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  }, [filterType, searchTerm, logs]);

  const exportLogs = () => {
    const csv = [
      ["Action", "User", "Time", "Status", "Details"],
      ...filteredLogs.map((log) => [
        log.action,
        log.user,
        log.time,
        log.status,
        log.details,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-log-${new Date().toISOString()}.csv`;
    a.click();
  };

  const clearLogs = () => {
    if (window.confirm("Are you sure you want to clear all logs?")) {
      setLogs([]);
      setFilteredLogs([]);
    }
  };

  return (
    <div className="p-8 bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="p-4 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl shadow-xl">
          <Activity className="text-white" size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Activity Audit Trail
          </h1>
          <p className="text-slate-400 mt-1">
            Track all actions and changes in your dashboard
          </p>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 mb-6 animate-fadeIn stagger-1">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Search Activity
            </label>
            <input
              type="text"
              placeholder="Search by action or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Filter */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Filter by Status
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Activities</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4 pt-4 border-t border-slate-200">
          <button
            onClick={exportLogs}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Download size={18} />
            Export as CSV
          </button>
          <button
            onClick={clearLogs}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            <Trash2 size={18} />
            Clear All
          </button>
        </div>
      </div>

      {/* Activity Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-fadeIn stagger-2">
        <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Action</th>
                <th className="px-6 py-4 text-left font-semibold">User</th>
                <th className="px-6 py-4 text-left font-semibold">Time</th>
                <th className="px-6 py-4 text-left font-semibold">Status</th>
                <th className="px-6 py-4 text-left font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log, index) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50 transition-colors animate-fadeIn"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-slate-400" />
                        {log.user}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-slate-400" />
                        {log.time}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                          log.status === "success"
                            ? "bg-green-100 text-green-700"
                            : log.status === "warning"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        <CheckCircle2 size={14} />
                        {log.status.charAt(0).toUpperCase() +
                          log.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{log.details}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    No activities found matching your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid md:grid-cols-4 gap-6 mt-8">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-100 animate-fadeIn stagger-3">
          <p className="text-sm text-slate-600 mb-2">Total Activities</p>
          <p className="text-3xl font-bold text-slate-900">{logs.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-100 animate-fadeIn stagger-4">
          <p className="text-sm text-slate-600 mb-2">Success Rate</p>
          <p className="text-3xl font-bold text-green-600">
            {Math.round(
              (logs.filter((l) => l.status === "success").length /
                logs.length) *
                100
            )}
            %
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-100 animate-fadeIn stagger-5">
          <p className="text-sm text-slate-600 mb-2">Warnings</p>
          <p className="text-3xl font-bold text-orange-600">
            {logs.filter((l) => l.status === "warning").length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-100 animate-fadeIn stagger-1">
          <p className="text-sm text-slate-600 mb-2">Errors</p>
          <p className="text-3xl font-bold text-red-600">
            {logs.filter((l) => l.status === "error").length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogPage;

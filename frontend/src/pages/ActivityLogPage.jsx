import { useState, useEffect } from "react";
import axios from "axios";
import {
  Activity,
  Trash2,
  Download,
  Filter,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { normalizeRole, ROLES } from "../utils/roles";

const ActivityLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [filteredLogs, setFilteredLogs] = useState(logs);
  const [filterType, setFilterType] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [avatarLoadErrors, setAvatarLoadErrors] = useState({});

  const getInitials = (nameOrEmail) => {
    const val = (nameOrEmail || "").trim();
    if (!val) return "U";
    const parts = val.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
    }
    return val[0].toUpperCase();
  };

  const getAvatarUrl = (avatar) => {
    if (!avatar) return "";
    if (avatar.startsWith("http://") || avatar.startsWith("https://"))
      return avatar;
    if (avatar.startsWith("//")) return `http:${avatar}`;
    return `http://localhost:5000${avatar}`;
  };

  const getAvatarKey = (log, index) =>
    String(log?._id || `${log?.user || "unknown"}-${index}`);

  const shouldShowAvatar = (log, index) => {
    const avatarUrl = getAvatarUrl(log?.avatar);
    const avatarKey = getAvatarKey(log, index);
    return Boolean(avatarUrl && !avatarLoadErrors[avatarKey]);
  };

  const formatRelativeTime = (value) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    const diffMs = Date.now() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 60) return "just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? "" : "s"} ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;

    return date.toLocaleString();
  };

  const fetchLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:5000/api/activity/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLogs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load activity logs");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    let filtered = logs;

    if (filterType !== "all") {
      filtered = filtered.filter(
        (log) => (log.status || "success") === filterType,
      );
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter(
        (log) => normalizeRole(log.userRole) === normalizeRole(roleFilter),
      );
    }

    if (dateFrom) {
      const fromTime = new Date(dateFrom).setHours(0, 0, 0, 0);
      filtered = filtered.filter((log) => {
        const ts = log.timestamp ? new Date(log.timestamp).getTime() : 0;
        return ts >= fromTime;
      });
    }

    if (dateTo) {
      const toTime = new Date(dateTo).setHours(23, 59, 59, 999);
      filtered = filtered.filter((log) => {
        const ts = log.timestamp ? new Date(log.timestamp).getTime() : 0;
        return ts <= toTime;
      });
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          (log.action || "").toLowerCase().includes(term) ||
          (log.details || "").toLowerCase().includes(term),
      );
    }

    setFilteredLogs(filtered);
  }, [filterType, roleFilter, dateFrom, dateTo, searchTerm, logs]);

  const exportLogs = () => {
    const csv = [
      ["Action", "User", "Role", "Time", "Status", "Details"],
      ...filteredLogs.map((log) => [
        log.action || "",
        log.user || "",
        log.userRole || "",
        log.timestamp ? new Date(log.timestamp).toLocaleString() : "",
        log.status || "",
        log.details || "",
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

  const clearLogs = async () => {
    if (window.confirm("Are you sure you want to clear all logs?")) {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        await axios.delete("http://localhost:5000/api/activity/all", {
          headers: { Authorization: `Bearer ${token}` },
        });
        await fetchLogs();
      } catch (err) {
        setError(
          err.response?.data?.message || "Failed to clear activity logs",
        );
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="p-8 min-h-screen bg-[var(--bg-page)] text-[var(--text-main)]">
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
      <div className="bg-[var(--bg-surface)] text-[var(--text-main)] p-6 rounded-2xl shadow-xl border border-[var(--border-soft)] mb-6 animate-fadeIn stagger-1">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {/* Search */}
          <div className="lg:col-span-2 md:col-span-2 col-span-1">
            <label className="block text-sm font-semibold text-[var(--text-main)] mb-2">
              Search Activity
            </label>
            <input
              type="text"
              placeholder="Search by action or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control w-full rounded-lg"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold text-[var(--text-main)] mb-2">
              Filter by Status
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="form-control w-full rounded-lg"
            >
              <option value="all">All Activities</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-semibold text-[var(--text-main)] mb-2">
              Filter by Role
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="form-control w-full rounded-lg"
            >
              <option value="all">All Roles</option>
              <option value={ROLES.ADMIN}>Admin</option>
              <option value={ROLES.MANAGER}>Manager</option>
              <option value={ROLES.EMPLOYEE}>Employee</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-semibold text-[var(--text-main)] mb-2">
              From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="form-control w-full rounded-lg"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-semibold text-[var(--text-main)] mb-2">
              To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="form-control w-full rounded-lg"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4 pt-4 border-t border-[var(--border-soft)]">
          <button
            onClick={exportLogs}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            disabled={loading}
          >
            <Download size={18} />
            Export as CSV
          </button>
          <button
            onClick={clearLogs}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            disabled={loading}
          >
            <Trash2 size={18} />
            Clear All
          </button>
        </div>
      </div>

      {/* Activity Table */}
      <div className="bg-[var(--bg-surface)] text-[var(--text-main)] rounded-2xl shadow-xl border border-[var(--border-soft)] overflow-hidden animate-fadeIn stagger-2">
        <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
          <table className="w-full">
            <thead className="table-head">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Action</th>
                <th className="px-6 py-4 text-left font-semibold">User</th>
                <th className="px-6 py-4 text-left font-semibold">Role</th>
                <th className="px-6 py-4 text-left font-semibold">Time</th>
                <th className="px-6 py-4 text-left font-semibold">Status</th>
                <th className="px-6 py-4 text-left font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {loading ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    Loading activity logs...
                  </td>
                </tr>
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map((log, index) => (
                  <tr
                    key={log._id || index}
                    className="table-row table-row-hover animate-fadeIn"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <td className="px-6 py-4 font-semibold text-[var(--text-main)]">
                      {log.action || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-[var(--text-main)]">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-full border border-[var(--border-soft)] bg-[var(--bg-surface)] flex items-center justify-center text-sm font-semibold text-[var(--text-main)]">
                          {shouldShowAvatar(log, index) ? (
                            <img
                              src={getAvatarUrl(log.avatar)}
                              alt={log.user || "User"}
                              className="h-full w-full object-cover"
                              onError={() => {
                                const avatarKey = getAvatarKey(log, index);
                                setAvatarLoadErrors((prev) => ({
                                  ...prev,
                                  [avatarKey]: true,
                                }));
                              }}
                            />
                          ) : (
                            getInitials(log.user || log.userRole || "U")
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-[var(--text-main)]">
                            {log.user || "System"}
                          </div>
                          {log.details?.includes("@") && (
                            <div className="text-xs text-slate-500 dark:text-slate-300 truncate max-w-[200px]">
                              {
                                log.details.match(
                                  /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/,
                                )?.[1]
                              }
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {log.userRole ? normalizeRole(log.userRole) : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-slate-400" />
                        {formatRelativeTime(log.timestamp)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const status = log.status || "success";
                        return (
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                              status === "success"
                                ? "bg-green-100 text-green-700"
                                : status === "warning"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            <CheckCircle2 size={14} />
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {log.details || "N/A"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
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
        <div className="bg-[var(--bg-surface)] text-[var(--text-main)] p-6 rounded-xl shadow-lg border border-[var(--border-soft)] animate-fadeIn stagger-3">
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
            Total Activities
          </p>
          <p className="text-3xl font-bold text-[var(--text-main)]">
            {logs.length}
          </p>
        </div>
        <div className="bg-[var(--bg-surface)] text-[var(--text-main)] p-6 rounded-xl shadow-lg border border-[var(--border-soft)] animate-fadeIn stagger-4">
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
            Success Rate
          </p>
          <p className="text-3xl font-bold text-green-600">
            {logs.length
              ? Math.round(
                  (logs.filter((l) => l.status === "success").length /
                    logs.length) *
                    100,
                )
              : 0}
            %
          </p>
        </div>
        <div className="bg-[var(--bg-surface)] text-[var(--text-main)] p-6 rounded-xl shadow-lg border border-[var(--border-soft)] animate-fadeIn stagger-5">
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
            Warnings
          </p>
          <p className="text-3xl font-bold text-orange-600">
            {logs.filter((l) => l.status === "warning").length}
          </p>
        </div>
        <div className="bg-[var(--bg-surface)] text-[var(--text-main)] p-6 rounded-xl shadow-lg border border-[var(--border-soft)] animate-fadeIn stagger-1">
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
            Errors
          </p>
          <p className="text-3xl font-bold text-red-600">
            {logs.filter((l) => l.status === "error").length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogPage;

import { NavLink } from "react-router-dom";
import { LayoutDashboard, Upload, Database, Target, Sparkles, FileText, Activity, Zap, TrendingUp, Users, Settings } from "lucide-react";
import ProfileDropdown from "./ProfileDropdown";

const Sidebar = () => {
  const role = localStorage.getItem("role") || "user";

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 ${
      isActive
        ? "bg-sky-100 text-slate-900 font-semibold border border-sky-200 shadow-md dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
        : "text-slate-600 border border-transparent hover:bg-sky-100 hover:text-slate-900 hover:border-sky-200 hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white dark:hover:border-slate-700"
    }`;

  return (
    <>
      <aside className="app-sidebar fixed left-0 top-0 z-50 h-screen w-64 bg-[var(--bg-sidebar)] text-[var(--text-main)] flex flex-col p-6 shadow-2xl shadow-black/10 border-r border-[var(--border-soft)] overflow-y-auto scrollbar-hide">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-lg">
              <Sparkles className="text-black" size={24} />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-teal-500 bg-clip-text text-transparent">Analytics</h2>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-2 dark:text-slate-400">Core Modules</div>
          <NavLink to="/dashboard" className={linkClass}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/csv" className={linkClass}>
            <Upload size={20} />
            <span>CSV Upload</span>
          </NavLink>
          <NavLink to="/api-data" className={linkClass}>
            <Database size={20} />
            <span>API Data</span>
          </NavLink>
          <NavLink to="/kpis" className={linkClass}>
            <Target size={20} />
            <span>KPIs</span>
          </NavLink>
          <NavLink to="/data-cleaning" className={linkClass}>
            <Sparkles size={20} />
            <span>Data Cleaning</span>
          </NavLink>
          <NavLink to="/reports" className={linkClass}>
            <FileText size={20} />
            <span>Reports</span>
          </NavLink>

          {role === "admin" && (
            <>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-2 mt-6">Management</div>
              <NavLink to="/admin" className={linkClass}>
                <Settings size={20} />
                <span>Admin Management</span>
              </NavLink>
              <NavLink to="/data-quality" className={linkClass}>
                <Zap size={20} />
                <span>Data Quality</span>
              </NavLink>
              <NavLink to="/activity-log" className={linkClass}>
                <Activity size={20} />
                <span>Activity Audit</span>
              </NavLink>
              <NavLink to="/sales" className={linkClass}>
                <TrendingUp size={20} />
                <span>Sales Analytics</span>
              </NavLink>
            </>
          )}
        </nav>

        <div className="mt-auto pt-6">
          <ProfileDropdown variant="sidebar" />
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

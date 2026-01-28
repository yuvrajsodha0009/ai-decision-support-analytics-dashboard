import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import LogoutModal from "./LogoutModal";
import { toast } from "react-hot-toast";
import { LayoutDashboard, Upload, Database, Target, Sparkles, FileText, LogOut, Activity, Zap, TrendingUp, Users, Settings } from "lucide-react";

const Sidebar = () => {
  const navigate = useNavigate();
  const [showLogout, setShowLogout] = useState(false);
  const role = localStorage.getItem("role") || "user";

  const confirmLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    toast.success("Logged out successfully");
    navigate("/", { replace: true });
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 ${
      isActive
        ? "bg-gradient-to-r from-cyan-400/20 to-teal-500/20 text-white font-semibold border border-cyan-400/50 shadow-lg shadow-cyan-500/20"
        : "text-slate-400 hover:bg-white/5 hover:text-white hover:translate-x-1 border border-transparent"
    }`;

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-gradient-to-b from-slate-950 via-black to-slate-900 text-white flex flex-col p-6 shadow-2xl shadow-black/50 border-r border-white/5 overflow-y-auto">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-lg">
              <Sparkles className="text-black" size={24} />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-teal-500 bg-clip-text text-transparent">Analytics</h2>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-2">Core Modules</div>
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

        <button
          onClick={() => setShowLogout(true)}
          className="flex items-center gap-3 w-full px-4 py-3 mt-6 text-left text-sm text-red-300 hover:text-red-200 hover:bg-red-950/30 border border-red-900/50 rounded-xl transition-all duration-200"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </aside>

      <LogoutModal
        isOpen={showLogout}
        onClose={() => setShowLogout(false)}
        onConfirm={confirmLogout}
      />
    </>
  );
};

export default Sidebar;

import { NavLink } from "react-router-dom";
import {
  Activity,
  Database,
  FileText,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import ProfileDropdown from "./ProfileDropdown";
import { isAdminRole, normalizeRole, ROLES } from "../utils/roles";

const SHOW_API_DATA_MODULE = false;

const Sidebar = ({
  collapsed,
  setCollapsed,
  isDesktop,
  mobileOpen,
  setMobileOpen,
}) => {
  const role = normalizeRole(localStorage.getItem("role") || ROLES.EMPLOYEE);
  const compact = isDesktop && collapsed;

  const closeMobileMenu = () => {
    if (!isDesktop) {
      setMobileOpen(false);
    }
  };

  const sidebarVisibility = isDesktop
    ? "translate-x-0"
    : mobileOpen
      ? "translate-x-0"
      : "-translate-x-full";

  const mainLinks = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/csv", label: "CSV Upload", icon: Upload },
    ...(SHOW_API_DATA_MODULE
      ? [{ to: "/api-data", label: "API Data", icon: Database }]
      : []),
    { to: "/kpis", label: "KPIs", icon: Target },
    { to: "/data-cleaning", label: "Data Cleaning", icon: Sparkles },
    { to: "/reports", label: "Reports", icon: FileText },
  ];

  const adminLinks = [
    { to: "/admin", label: "Admin Management", icon: Settings },
    { to: "/activity-log", label: "Activity Audit", icon: Activity },
    { to: "/admin/sales", label: "Raw Sales", icon: TrendingUp },
  ];

  const linkClass = ({ isActive }) =>
    `group flex items-center rounded-2xl border px-3 py-3 transition-all duration-200 ease-in-out ${
      compact ? "justify-center" : "gap-3"
    } ${
      isActive
        ? "border-cyan-300/35 bg-gradient-to-r from-cyan-500/25 to-indigo-500/25 text-white shadow-lg shadow-cyan-950/40"
        : "border-transparent text-slate-300 hover:border-cyan-400/20 hover:bg-slate-800/80 hover:text-white"
    }`;

  return (
    <>
      {!isDesktop && mobileOpen && (
        <button
          type="button"
          aria-label="Close Sidebar Overlay"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px]"
        />
      )}

      <aside
        className={`app-sidebar fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.98)_0%,rgba(2,6,23,0.98)_100%)] px-4 py-5 text-slate-100 shadow-2xl shadow-black/40 backdrop-blur-xl transition-all duration-200 ease-in-out lg:translate-x-0 ${
          compact ? "lg:w-24" : "lg:w-72"
        } ${isDesktop ? "" : "w-72"} ${sidebarVisibility}`}
      >
        <div className="mb-7 flex items-center justify-between">
          <div
            className={`flex items-center gap-3 ${compact ? "justify-center" : ""}`}
          >
            <div className="rounded-xl border border-cyan-300/30 bg-gradient-to-br from-cyan-400 to-indigo-500 p-2.5 shadow-lg shadow-cyan-500/30">
              <Sparkles className="text-slate-950" size={18} />
            </div>
            {!compact && (
              <h2 className="text-xl font-semibold tracking-tight text-white">
                Analytics OS
              </h2>
            )}
          </div>

          {isDesktop ? (
            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              className="rounded-xl border border-white/10 bg-slate-800/60 p-2 text-slate-200 transition-all duration-200 ease-in-out hover:bg-slate-700/70"
              aria-label={compact ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {compact ? (
                <PanelLeftOpen size={16} />
              ) : (
                <PanelLeftClose size={16} />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="rounded-xl border border-white/10 bg-slate-800/60 p-2 text-slate-200"
              aria-label="Close Sidebar"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <nav className="scrollbar-hide min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
          {!compact && (
            <p className="px-2 pb-1 text-xs uppercase tracking-[0.22em] text-slate-500">
              Core Modules
            </p>
          )}

          {mainLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeMobileMenu}
              className={linkClass}
              title={compact ? item.label : undefined}
            >
              <item.icon size={18} className="shrink-0" />
              {!compact && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </NavLink>
          ))}

          {isAdminRole(role) && (
            <>
              {!compact && (
                <p className="mt-4 px-2 pb-1 text-xs uppercase tracking-[0.22em] text-slate-500">
                  Management
                </p>
              )}
              {adminLinks.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={closeMobileMenu}
                  className={linkClass}
                  title={compact ? item.label : undefined}
                >
                  <item.icon size={18} className="shrink-0" />
                  {!compact && (
                    <span className="text-sm font-medium">{item.label}</span>
                  )}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className={`mt-auto pt-6 ${compact ? "px-1" : ""}`}>
          {!compact ? (
            <ProfileDropdown variant="sidebar" />
          ) : (
            <NavLink
              to="/settings"
              title="Settings"
              className="flex items-center justify-center rounded-2xl border border-white/10 bg-slate-800/70 py-3 text-slate-200 transition-all duration-200 ease-in-out hover:bg-slate-700/80 hover:text-white"
            >
              <Settings size={18} />
            </NavLink>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
  LayoutDashboard,
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
  isDesktop,
  mobileOpen,
  setMobileOpen,
  onDesktopCollapseChange,
}) => {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const role = normalizeRole(localStorage.getItem("role") || ROLES.EMPLOYEE);
  const compact = isDesktop && desktopCollapsed;

  const toggleDesktopCollapse = () => {
    setDesktopCollapsed((previous) => {
      const next = !previous;
      onDesktopCollapseChange?.(next);
      return next;
    });
  };

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
    { to: "/admin", label: "Admin Management", icon: Settings, end: true },
    { to: "/activity-log", label: "Activity Audit", icon: Activity },
    { to: "/admin/sales", label: "Raw Sales", icon: TrendingUp },
  ];

  const linkClass = ({ isActive }) =>
    `group relative overflow-hidden flex items-center rounded-2xl border px-3 py-3 transition-[background-color,border-color,color,padding,gap] duration-180 ease-out after:absolute after:bottom-2 after:left-0 after:top-2 after:w-[2px] after:rounded-r-full after:bg-cyan-300/85 after:transition-opacity after:duration-180 ${
      compact ? "justify-center" : "gap-3"
    } ${
      isActive
        ? "border-cyan-300/35 bg-gradient-to-r from-cyan-500/25 to-indigo-500/25 text-white shadow-lg shadow-cyan-950/40 after:opacity-100"
        : "border-transparent text-slate-300 after:opacity-0 hover:border-cyan-400/20 hover:bg-slate-800/80 hover:text-white hover:after:opacity-80"
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
        data-compact={compact ? "true" : "false"}
        className={`app-sidebar group fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.98)_0%,rgba(2,6,23,0.98)_100%)] px-4 py-5 text-slate-100 shadow-2xl shadow-black/40 backdrop-blur-xl lg:translate-x-0 ${
          isDesktop ? "" : "w-72"
        } ${sidebarVisibility}`}
      >
        {isDesktop && (
          <button
            type="button"
            onClick={toggleDesktopCollapse}
            className="absolute -right-2.5 top-1/2 z-20 inline-flex h-11 w-5 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-300/20 bg-slate-950/55 text-cyan-200/70 shadow-[0_6px_14px_rgba(2,6,23,0.35)] backdrop-blur-sm opacity-20 transition-all duration-200 ease-out hover:border-cyan-200/45 hover:bg-slate-900/80 hover:text-cyan-100 hover:opacity-100 focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-95"
            aria-label={compact ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {compact ? (
              <ChevronRight size={12} strokeWidth={1.6} />
            ) : (
              <ChevronLeft size={12} strokeWidth={1.6} />
            )}
          </button>
        )}

        <div
          className={`mb-7 flex items-center ${compact ? "justify-center" : "justify-between"}`}
        >
          <div
            className={`flex items-center gap-3 ${compact ? "w-full justify-center" : ""}`}
          >
            <button
              type="button"
              onClick={isDesktop ? toggleDesktopCollapse : undefined}
              aria-label={
                isDesktop
                  ? compact
                    ? "Expand Sidebar"
                    : "Collapse Sidebar"
                  : "Analytics"
              }
              className={`rounded-xl border border-cyan-300/30 bg-gradient-to-br from-cyan-400 to-indigo-500 p-2.5 shadow-lg shadow-cyan-500/30 ${
                isDesktop
                  ? "cursor-pointer transition-transform duration-150 ease-out hover:scale-[1.03]"
                  : "cursor-default"
              }`}
            >
              <Sparkles className="text-slate-950" size={18} />
            </button>
            <h2
              data-sidebar-text
              className="text-xl font-semibold tracking-tight text-white"
            >
              Analytics OS
            </h2>
          </div>

          {!isDesktop && (
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
          <p
            data-sidebar-text
            className="px-2 pb-1 text-xs uppercase tracking-[0.22em] text-slate-500"
          >
            Core Modules
          </p>

          {mainLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeMobileMenu}
              className={linkClass}
              title={compact ? item.label : undefined}
            >
              <item.icon size={18} className="shrink-0" />
              <span data-sidebar-text className="text-sm font-medium">
                {item.label}
              </span>
            </NavLink>
          ))}

          {isAdminRole(role) && (
            <>
              <div
                data-sidebar-divider
                className="mx-1 h-px rounded-full bg-gradient-to-r from-cyan-300/0 via-cyan-300/45 to-cyan-300/0 shadow-[0_0_10px_rgba(34,211,238,0.2)]"
              />
              <p
                data-sidebar-heading
                data-sidebar-text
                className="px-2 pb-1 text-xs uppercase tracking-[0.22em] text-slate-500"
              >
                Management
              </p>
              {adminLinks.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={closeMobileMenu}
                  className={linkClass}
                  title={compact ? item.label : undefined}
                >
                  <item.icon size={18} className="shrink-0" />
                  <span data-sidebar-text className="text-sm font-medium">
                    {item.label}
                  </span>
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className={`mt-auto pt-6 ${compact ? "px-1" : ""}`}>
          <ProfileDropdown variant="sidebar" compact={compact} />
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

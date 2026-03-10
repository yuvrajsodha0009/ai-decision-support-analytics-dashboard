import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { PanelLeftOpen } from "lucide-react";
import Sidebar from "./Sidebar";

const DESKTOP_BREAKPOINT = 1024;

const isDesktopViewport = () => {
  if (typeof window === "undefined") return true;
  return window.innerWidth >= DESKTOP_BREAKPOINT;
};

const DashboardLayout = () => {
  const [isDesktop, setIsDesktop] = useState(isDesktopViewport);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      const desktop = isDesktopViewport();
      setIsDesktop(desktop);
      if (desktop) setMobileOpen(false);
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="app-shell flex min-h-screen overflow-hidden bg-[#020617] text-slate-100">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        isDesktop={isDesktop}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <main
        className={`app-main relative flex-1 overflow-y-auto bg-transparent transition-all duration-200 ease-in-out ${
          isDesktop ? (collapsed ? "lg:ml-24" : "lg:ml-72") : "ml-0"
        }`}
      >
        <div className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2 text-sm font-medium text-slate-100 transition-all duration-200 ease-in-out hover:bg-slate-700/70"
          >
            <PanelLeftOpen size={16} />
            Open Menu
          </button>
        </div>
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;

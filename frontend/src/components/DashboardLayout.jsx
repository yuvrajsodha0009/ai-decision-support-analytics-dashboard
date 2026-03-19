import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { PanelLeftOpen } from "lucide-react";
import Sidebar from "./Sidebar";

const DESKTOP_BREAKPOINT = 1024;

const isDesktopViewport = () => {
  if (typeof window === "undefined") return true;
  return window.innerWidth >= DESKTOP_BREAKPOINT;
};

const DashboardLayout = () => {
  const shellRef = useRef(null);
  const [isDesktop, setIsDesktop] = useState(isDesktopViewport);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDesktopCollapseChange = useCallback((collapsed) => {
    if (!shellRef.current) return;
    shellRef.current.setAttribute(
      "data-sidebar-collapsed",
      collapsed ? "true" : "false",
    );
  }, []);

  useEffect(() => {
    if (shellRef.current) {
      shellRef.current.setAttribute("data-sidebar-collapsed", "false");
    }

    const onResize = () => {
      const desktop = isDesktopViewport();
      setIsDesktop(desktop);
      if (desktop) setMobileOpen(false);
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div
      ref={shellRef}
      data-sidebar-collapsed="false"
      className="app-shell flex min-h-screen overflow-hidden bg-[#020617] text-slate-100"
    >
      <Sidebar
        isDesktop={isDesktop}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onDesktopCollapseChange={handleDesktopCollapseChange}
      />

      <main className="app-main relative flex-1 overflow-y-auto bg-transparent">
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

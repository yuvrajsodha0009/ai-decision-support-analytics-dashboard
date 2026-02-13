import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

const DashboardLayout = () => {
  return (
    <div className="app-shell flex h-screen overflow-hidden bg-[var(--bg-page)] text-[var(--text-main)]">
      <Sidebar />

      <main className="app-main relative ml-64 flex-1 overflow-y-auto bg-[var(--bg-page)] text-[var(--text-main)]">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;

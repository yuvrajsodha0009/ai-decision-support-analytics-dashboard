import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

const DashboardLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-black">
      <Sidebar />

      <main className="ml-64 flex-1 overflow-y-auto bg-gradient-to-br from-slate-950 via-black to-slate-900">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;

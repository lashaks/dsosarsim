import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout() {
  const [sector, setSector] = useState("All Sectors");

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar sector={sector} onSector={setSector} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet context={{ sector }} />
        </main>
      </div>
    </div>
  );
}

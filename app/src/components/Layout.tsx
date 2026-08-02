import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import "./Layout.css";

export default function Layout() {
  const [sidebarAbierta, setSidebarAbierta] = useState(false);

  return (
    <div className="app-shell">
      <button
        className="boton-hamburguesa"
        onClick={() => setSidebarAbierta((v) => !v)}
        aria-label={sidebarAbierta ? "Cerrar menú" : "Abrir menú"}
      >
        {sidebarAbierta ? "✕" : "☰"}
      </button>
      <Sidebar abierto={sidebarAbierta} onCerrar={() => setSidebarAbierta(false)} />
      {sidebarAbierta && <div className="sidebar-overlay" onClick={() => setSidebarAbierta(false)} />}
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
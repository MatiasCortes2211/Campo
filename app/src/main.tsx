import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import ListaCampos from "./pages/ListaCampos";
import DetalleCampo from "./pages/DetalleCampo";
import NuevoCampo from "./pages/NuevoCampo";
import Login from "./pages/Login";
import CambiarPassword from "./pages/CambiarPassword";
import RequireAuth from "./components/RequireAuth";
import Layout from "./components/Layout";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<ListaCampos />} />
          <Route path="/campos/nuevo" element={<NuevoCampo />} />
          <Route path="/campos/:campoId" element={<DetalleCampo />} />
          <Route path="/cambiar-password" element={<CambiarPassword />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
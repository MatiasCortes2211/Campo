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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <ListaCampos />
            </RequireAuth>
          }
        />
        <Route
          path="/campos/nuevo"
          element={
            <RequireAuth>
              <NuevoCampo />
            </RequireAuth>
          }
        />
        <Route
          path="/campos/:campoId"
          element={
            <RequireAuth>
              <DetalleCampo />
            </RequireAuth>
          }
        />
        <Route
          path="/cambiar-password"
          element={
            <RequireAuth>
              <CambiarPassword />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
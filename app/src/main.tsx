import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import ListaCampos from "./pages/ListaCampos";
import DetalleCampo from "./pages/DetalleCampo";
import NuevoCampo from "./pages/NuevoCampo";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ListaCampos />} />
        <Route path="/campos/nuevo" element={<NuevoCampo />} />
        <Route path="/campos/:campoId" element={<DetalleCampo />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);

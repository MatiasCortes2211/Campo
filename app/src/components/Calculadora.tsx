import { useState } from "react";
import "./Calculadora.css";

// Calculadora pura: cantidad x precio x kg. No toca la base de datos,
// sirve para simular un acuerdo o una venta hipotética sin ensuciar el Stock real.
export default function Calculadora() {
  const [cantidad, setCantidad] = useState("");
  const [precioKg, setPrecioKg] = useState("");
  const [kgs, setKgs] = useState("");

  const resultado = (Number(cantidad) || 0) * (Number(precioKg) || 0) * (Number(kgs) || 0);

  return (
    <div className="calculadora">
      <h3>Calculadora de valor</h3>
      <div className="calculadora-inputs">
        <label>
          Cantidad
          <input type="number" min={0} value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
        </label>
        <label>
          Precio $/kg
          <input type="number" min={0} value={precioKg} onChange={(e) => setPrecioKg(e.target.value)} />
        </label>
        <label>
          Kgs
          <input type="number" min={0} value={kgs} onChange={(e) => setKgs(e.target.value)} />
        </label>
      </div>
      <p className="calculadora-resultado">
        Valor total: <strong>${resultado.toLocaleString("es-AR")}</strong>
      </p>
    </div>
  );
}

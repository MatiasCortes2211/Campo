import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { crearCampo } from "../services/campoService";
import { getUsuarioActual } from "../services/authService";
import "./ListaCampos.css";

export default function NuevoCampo() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [hectareas, setHectareas] = useState("");
  const [renspa, setRenspa] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    const campo = await crearCampo({
      grupoId: getUsuarioActual()!.grupoId,
      nombre,
      ubicacion,
      hectareas: Number(hectareas) || 0,
      renspa,
    });
    navigate(`/campos/${campo.id}`);
  }

  return (
    <div className="pantalla">
      <header className="encabezado">
        <h1>Nuevo campo</h1>
      </header>

      <form className="formulario" onSubmit={handleSubmit}>
        <label>
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </label>
        <label>
          Ubicación
          <input value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} />
        </label>
        <label>
          Hectáreas
          <input
            type="number"
            value={hectareas}
            onChange={(e) => setHectareas(e.target.value)}
          />
        </label>
        <label>
          RENSPA
          <input value={renspa} onChange={(e) => setRenspa(e.target.value)} />
        </label>

        <button type="submit" className="boton boton-primario" disabled={guardando}>
          {guardando ? "Guardando..." : "Guardar campo"}
        </button>
      </form>
    </div>
  );
}

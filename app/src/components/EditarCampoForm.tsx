import { useState } from "react";
import type { Campo } from "../types/domain";
import { editarCampo } from "../services/campoService";
import BuscadorUbicacion from "./BuscadorUbicacion";
import "./NuevoEventoForm.css";

interface Props {
  campo: Campo;
  onGuardado: () => void;
  onCancelar: () => void;
}

export default function EditarCampoForm({ campo, onGuardado, onCancelar }: Props) {
  const [nombre, setNombre] = useState(campo.nombre);
  const [ubicacion, setUbicacion] = useState(campo.ubicacion);
  const [hectareas, setHectareas] = useState(String(campo.hectareas));
  const [renspa, setRenspa] = useState(campo.renspa);
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    await editarCampo(campo.id, {
      nombre,
      ubicacion,
      hectareas: Number(hectareas) || 0,
      renspa,
    });
    setGuardando(false);
    onGuardado();
  }

  return (
    <div className="overlay">
      <form className="modal-evento" onSubmit={handleSubmit}>
        <h2>Editar campo</h2>

        <label>
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </label>

        <label>
          Ubicación
          <BuscadorUbicacion value={ubicacion} onChange={setUbicacion} />
        </label>

        <label>
          Hectáreas
          <input type="number" value={hectareas} onChange={(e) => setHectareas(e.target.value)} />
        </label>

        <label>
          RENSPA
          <input value={renspa} onChange={(e) => setRenspa(e.target.value)} />
        </label>

        <div className="acciones-modal">
          <button type="button" className="boton boton-secundario" onClick={onCancelar}>
            Cancelar
          </button>
          <button type="submit" className="boton boton-primario" disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
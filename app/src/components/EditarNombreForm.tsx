import { useState } from "react";
import { actualizarNombre } from "../services/authService";
import "./NuevoEventoForm.css";
import type { UsuarioActual } from "../services/authService";

interface Props {
  nombreActual: string;
  onGuardado: (usuarioActualizado: UsuarioActual) => void;
  onCancelar: () => void;
}

export default function EditarNombreForm({ nombreActual, onGuardado, onCancelar }: Props) {
  const [nombre, setNombre] = useState(nombreActual);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const actualizado = await actualizarNombre(nombre);
      onGuardado(actualizado);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar el nombre.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="overlay">
      <form className="modal-evento" onSubmit={handleSubmit}>
        <h2>Editar nombre</h2>
        <label>
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </label>
        {error && <p className="mensaje-error">{error}</p>}
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
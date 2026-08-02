import { useState } from "react";
import type { Ocupante, TipoOcupante } from "../types/domain";
import { crearOcupante, editarOcupante, haySolapamiento, hoyISO } from "../services/ocupanteService";
import { getUsuarioActual } from "../services/authService";
import "../components/NuevoEventoForm.css";

interface Props {
  campoId: string;
  periodoAEditar?: Ocupante | null;
  onGuardado: () => void;
  onCancelar: () => void;
}

export default function OcupanteForm({ campoId, periodoAEditar, onGuardado, onCancelar }: Props) {
  const modoEdicion = !!periodoAEditar;
  const usuarioActual = getUsuarioActual();

  const [tipo, setTipo] = useState<TipoOcupante>(periodoAEditar?.tipo ?? "propio");
  const [nombre, setNombre] = useState(
    periodoAEditar?.nombre ?? (tipo === "propio" ? usuarioActual?.nombre ?? "" : "")
  );
  const [contacto, setContacto] = useState(periodoAEditar?.contacto ?? "");
  const [cuit, setCuit] = useState(periodoAEditar?.cuit ?? "");
  const [comentario, setComentario] = useState(periodoAEditar?.comentario ?? "");
  const [desde, setDesde] = useState(periodoAEditar?.fechaInicio.slice(0, 10) ?? hoyISO());
  const [hasta, setHasta] = useState(periodoAEditar?.fechaFin?.slice(0, 10) ?? "");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function handleTipoChange(nuevoTipo: TipoOcupante) {
    setTipo(nuevoTipo);
    if (nuevoTipo === "propio") {
      // Se carga el nombre del perfil automáticamente — el usuario
      // igual puede editarlo después si quiere poner otro nombre
      // (por ejemplo, un familiar que también explota el campo).
      setNombre(usuarioActual?.nombre ?? "");
    } else if (tipo === "propio" && nuevoTipo === "alquilado") {
      // Al pasar a alquilado, se limpia para que carguen el nombre
      // real del inquilino en vez de dejar el nombre propio puesto.
      setNombre("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (hasta && hasta < desde) {
      setError("La fecha 'Hasta' no puede ser anterior a 'Desde'.");
      return;
    }

    setGuardando(true);

    const solapa = await haySolapamiento({
      campoId,
      fechaInicio: desde,
      fechaFin: hasta || null,
      excluirId: periodoAEditar?.id,
    });

    if (solapa) {
      setError("Esas fechas se pisan con otro período ya cargado para este campo. Ajustá el Desde/Hasta.");
      setGuardando(false);
      return;
    }

    if (modoEdicion && periodoAEditar) {
      await editarOcupante(periodoAEditar.id, {
        tipo,
        nombre,
        contacto: contacto || undefined,
        cuit: cuit || undefined,
        comentario: comentario || undefined,
        fechaInicio: desde,
        fechaFin: hasta || null,
      });
    } else {
      await crearOcupante({
        campoId,
        tipo,
        nombre,
        contacto: contacto || undefined,
        cuit: cuit || undefined,
        comentario: comentario || undefined,
        fechaInicio: desde,
        fechaFin: hasta || null,
      });
    }

    setGuardando(false);
    onGuardado();
  }

  return (
    <div className="overlay">
      <form className="modal-evento" onSubmit={handleSubmit}>
        <h2>{modoEdicion ? "Editar período" : "Nuevo período de ocupación"}</h2>

        <label>
          Tipo
          <select value={tipo} onChange={(e) => handleTipoChange(e.target.value as TipoOcupante)}>
            <option value="propio">Propio (lo trabajamos nosotros)</option>
            <option value="alquilado">Alquilado a un tercero</option>
          </select>
        </label>

        <label>
          Nombre {tipo === "alquilado" ? "del inquilino" : ""}
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </label>

        {tipo === "alquilado" && (
          <>
            <label>
              Contacto
              <input value={contacto} onChange={(e) => setContacto(e.target.value)} placeholder="Teléfono o email" />
            </label>
            <label>
              CUIT
              <input value={cuit} onChange={(e) => setCuit(e.target.value)} />
            </label>
          </>
        )}

        <div className="fila-fechas">
          <label>
            Desde
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} required />
          </label>
          <label>
            Hasta
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </label>
        </div>
        <p className="texto-mutado">Dejá "Hasta" en blanco si todavía sigue siendo el ocupante hoy.</p>

        <label>
          Comentario
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Ej: recordar llevarle la llave del candado del portón norte"
          />
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
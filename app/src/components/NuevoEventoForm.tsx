import { useState } from "react";
import { CATEGORIAS, TIPOS_EVENTO, type Categoria, type TipoEvento } from "../types/domain";
import { crearEvento, type LineaEvento } from "../services/eventoService";
import "./NuevoEventoForm.css";
import { hoyISO } from "../utils/fecha";

interface Props {
  campoId: string;
  onGuardado: () => void;
  onCancelar: () => void;
}

interface FilaFormulario {
  categoriaOrigen: Categoria;
  cantidad: string;
  categoriaDestino: Categoria;
}

function filaVacia(): FilaFormulario {
  return { categoriaOrigen: "Ternero", cantidad: "", categoriaDestino: "Novillo" };
}

export default function NuevoEventoForm({ campoId, onGuardado, onCancelar }: Props) {
  const [tipo, setTipo] = useState<TipoEvento>("nacimiento");
  const [fecha, setFecha] = useState(() => hoyISO());
  const [comentario, setComentario] = useState("");
  const [filas, setFilas] = useState<FilaFormulario[]>([filaVacia()]);
  const [guardando, setGuardando] = useState(false);

  const esRecategorizacion = tipo === "recategorizacion";

  function actualizarFila(index: number, cambios: Partial<FilaFormulario>) {
    setFilas((prev) => prev.map((f, i) => (i === index ? { ...f, ...cambios } : f)));
  }

  function agregarFila() {
    setFilas((prev) => [...prev, filaVacia()]);
  }

  function quitarFila(index: number) {
    setFilas((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);

    const lineas: LineaEvento[] = filas
      .filter((f) => Number(f.cantidad) > 0)
      .map((f) => ({
        categoriaOrigen: f.categoriaOrigen,
        cantidad: Number(f.cantidad),
        categoriaDestino: esRecategorizacion ? f.categoriaDestino : undefined,
      }));

    if (lineas.length === 0) {
      setGuardando(false);
      return;
    }

    await crearEvento({
      campoId,
      tipo,
      fecha,
      comentario: comentario || undefined,
      lineas,
    });

    setGuardando(false);
    onGuardado();
  }

  return (
    <div className="overlay">
      <form className="modal-evento" onSubmit={handleSubmit}>
        <h2>Cargar movimiento</h2>

        <label>
          Tipo de movimiento
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoEvento)}>
            {TIPOS_EVENTO.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Fecha
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>

        <div className="lineas">
          <p className="texto-mutado">Categorías involucradas</p>
          {filas.map((fila, index) => (
            <div className="fila-linea" key={index}>
              <select
                value={fila.categoriaOrigen}
                onChange={(e) =>
                  actualizarFila(index, { categoriaOrigen: e.target.value as Categoria })
                }
              >
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {esRecategorizacion && (
                <>
                  <span>→</span>
                  <select
                    value={fila.categoriaDestino}
                    onChange={(e) =>
                      actualizarFila(index, {
                        categoriaDestino: e.target.value as Categoria,
                      })
                    }
                  >
                    {CATEGORIAS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </>
              )}

              <input
                type="number"
                min={1}
                placeholder="Cantidad"
                value={fila.cantidad}
                onChange={(e) => actualizarFila(index, { cantidad: e.target.value })}
              />

              {filas.length > 1 && (
                <button
                  type="button"
                  className="boton-quitar"
                  onClick={() => quitarFila(index)}
                  aria-label="Quitar categoría"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          <button type="button" className="boton boton-secundario" onClick={agregarFila}>
            + Agregar categoría
          </button>
        </div>

        <label>
          Comentario (opcional)
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Ej: murieron por la sequía"
          />
        </label>

        <div className="acciones-modal">
          <button type="button" className="boton boton-secundario" onClick={onCancelar}>
            Cancelar
          </button>
          <button type="submit" className="boton boton-primario" disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar movimiento"}
          </button>
        </div>
      </form>
    </div>
  );
}

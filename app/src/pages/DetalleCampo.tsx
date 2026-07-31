import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { db } from "../db/database";
import type { Campo, Stock, EventoConDetalle, Ocupante } from "../types/domain";
import { PESOS_REFERENCIA } from "../types/domain";
import {
  listarPeriodosDeCampo,
  obtenerOcupanteDeHoy,
  eliminarOcupante,
} from "../services/ocupanteService";
import { anularEvento, historialDeCampo } from "../services/eventoService";
import NuevoEventoForm from "../components/NuevoEventoForm";
import OcupanteForm from "../components/OcupanteForm";
import Calculadora from "../components/Calculadora";
import "./DetalleCampo.css";
import { formatearFecha } from "../utils/fecha";
import EditarCampoForm from "../components/EditarCampoForm";

export default function DetalleCampo() {
  const { campoId } = useParams<{ campoId: string }>();
  const [campo, setCampo] = useState<Campo | null>(null);
  const [stock, setStock] = useState<Stock[]>([]);
  const [historial, setHistorial] = useState<EventoConDetalle[]>([]);
  const [ocupanteHoy, setOcupanteHoy] = useState<Ocupante | null>(null);
  const [periodos, setPeriodos] = useState<Ocupante[]>([]);
  const [mostrarOtrosPeriodos, setMostrarOtrosPeriodos] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarFormularioOcupante, setMostrarFormularioOcupante] = useState(false);
  const [periodoEnEdicion, setPeriodoEnEdicion] = useState<Ocupante | null>(null);
  const [mostrarFormularioCampo, setMostrarFormularioCampo] = useState(false);

  const cargarTodo = useCallback(async () => {
    if (!campoId) return;
    const [c, s, h, oHoy, p] = await Promise.all([
      db.campos.get(campoId),
      db.stock.where("campoId").equals(campoId).toArray(),
      historialDeCampo(campoId),
      obtenerOcupanteDeHoy(campoId),
      listarPeriodosDeCampo(campoId),
    ]);
    setCampo(c ?? null);
    setStock(s);
    setHistorial(h as EventoConDetalle[]);
    setOcupanteHoy(oHoy);
    setPeriodos(p);
  }, [campoId]);

  useEffect(() => {
    cargarTodo();
  }, [cargarTodo]);

  async function handleEliminarPeriodo(o: Ocupante) {
    const confirmado = window.confirm(`¿Eliminar el período de "${o.nombre}"?`);
    if (!confirmado) return;
    await eliminarOcupante(o.id);
    cargarTodo();
  }

  if (!campo || !campoId) {
    return (
      <div className="pantalla">
        <p className="texto-mutado">Cargando campo...</p>
      </div>
    );
  }

  const otrosPeriodos = periodos.filter((o) => o.id !== ocupanteHoy?.id);

  function filaPeriodo(o: Ocupante) {
    return (
      <li key={o.id}>
        <div className="evento-header">
          <span className="evento-tipo">
            {o.tipo === "alquilado" ? `Alquilado — ${o.nombre}` : `Propio — ${o.nombre}`}
          </span>
          <span className="texto-mutado">
            {formatearFecha(o.fechaInicio)} — {o.fechaFin ? formatearFecha(o.fechaFin) : "sigue"}
          </span>
          <button
            className="boton-link"
            onClick={() => {
              setPeriodoEnEdicion(o);
              setMostrarFormularioOcupante(true);
            }}
          >
            Editar
          </button>
          <button className="boton-link boton-link-peligro" onClick={() => handleEliminarPeriodo(o)}>
            Eliminar
          </button>
        </div>
        {o.contacto && <p className="texto-mutado">Contacto: {o.contacto}</p>}
        {o.cuit && <p className="texto-mutado">CUIT: {o.cuit}</p>}
        {o.comentario && <p className="evento-comentario">{o.comentario}</p>}
      </li>
    );
  }

  return (
    <div className="pantalla">
      <Link to="/" className="volver">
        ← Todos los campos
      </Link>

      <header className="encabezado-detalle">
        <div>
          <div className="titulo-con-editar">
            <h1>{campo.nombre}</h1>
            <button className="boton-link" onClick={() => setMostrarFormularioCampo(true)}>
              Editar
            </button>
          </div>
          <p className="texto-mutado">
            {campo.ubicacion} · {campo.hectareas} ha · RENSPA {campo.renspa || "sin cargar"}
          </p>
        </div>
        <span className={`badge ${ocupanteHoy?.tipo === "alquilado" ? "badge-alquilado" : "badge-propio"}`}>
          {ocupanteHoy
            ? ocupanteHoy.tipo === "alquilado"
              ? `Alquilado a ${ocupanteHoy.nombre}`
              : "Propio"
            : "Sin ocupante cargado hoy"}
        </span>
      </header>

      <section className="seccion">
        <div className="seccion-header">
          <h2>Stock actual</h2>
          <button className="boton boton-primario" onClick={() => setMostrarFormulario(true)}>
            + Cargar movimiento
          </button>
        </div>

        <table className="tabla-stock">
          <thead>
            <tr>
              <th>Categoría</th>
              <th>Cantidad</th>
              <th>Precio $/kg</th>
              <th>Actualizado</th>
            </tr>
          </thead>
          <tbody>
            {stock.map((s) => (
              <tr key={s.id}>
                <td>{s.categoria}</td>
                <td>{s.cantidadActual}</td>
                <td>{s.precioKg !== null ? `$${s.precioKg}` : "No aplica"}</td>
                <td className="texto-mutado">
                  {s.precioFecha ? new Date(s.precioFecha).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="seccion">
        <h2>Peso de referencia (informativo)</h2>
        <table className="tabla-stock tabla-referencia">
          <tbody>
            {PESOS_REFERENCIA.map((p) => (
              <tr key={p.categoria}>
                <td>{p.categoria}</td>
                <td>{p.pesoPromedioKg} kg</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Calculadora />
      </section>

      <section className="seccion">
        <div className="seccion-header">
          <h2>Ocupante</h2>
          <button
            className="boton boton-secundario"
            onClick={() => {
              setPeriodoEnEdicion(null);
              setMostrarFormularioOcupante(true);
            }}
          >
            + Nuevo período
          </button>
        </div>

        {ocupanteHoy ? (
          <ul className="lista-historial">{filaPeriodo(ocupanteHoy)}</ul>
        ) : (
          <p className="texto-mutado">No hay ningún período que cubra la fecha de hoy.</p>
        )}

        {otrosPeriodos.length > 0 && (
          <div className="historial-ocupantes">
            <button
              type="button"
              className="boton-link"
              onClick={() => setMostrarOtrosPeriodos((v) => !v)}
            >
              {mostrarOtrosPeriodos ? "Ocultar" : "Ver"} otros períodos ({otrosPeriodos.length})
            </button>
            {mostrarOtrosPeriodos && (
              <ul className="lista-historial">{otrosPeriodos.map(filaPeriodo)}</ul>
            )}
          </div>
        )}
      </section>

      <section className="seccion">
        <h2>Historial de movimientos</h2>
        {historial.length === 0 && <p className="texto-mutado">Todavía no hay movimientos cargados.</p>}
        <ul className="lista-historial">
          {historial.map((evento) => (
            <li key={evento.id} className={evento.estado === "anulado" ? "evento-anulado" : ""}>
              <div className="evento-header">
                <span className="evento-fecha">{formatearFecha(evento.fecha)}</span>
                <span className="evento-tipo">{evento.tipo}</span>
                {evento.eventoCorrigeId && <span className="badge badge-correccion">corrección</span>}
                {evento.estado === "activo" && (
                  <button className="boton-anular" onClick={async () => { await anularEvento(evento.id); cargarTodo(); }}>
                    Anular
                  </button>
                )}
              </div>
              <div className="evento-lineas">
                {evento.detalles.map((d) => (
                  <span key={d.id} className="evento-linea">
                    {d.categoriaDestino ? `${d.cantidad} ${d.categoriaOrigen} → ${d.categoriaDestino}` : `${d.cantidad} ${d.categoriaOrigen}`}
                  </span>
                ))}
              </div>
              {evento.comentario && <p className="evento-comentario">{evento.comentario}</p>}
            </li>
          ))}
        </ul>
      </section>

      {mostrarFormulario && (
        <NuevoEventoForm
          campoId={campoId}
          onGuardado={() => {
            setMostrarFormulario(false);
            cargarTodo();
          }}
          onCancelar={() => setMostrarFormulario(false)}
        />
      )}

      {mostrarFormularioOcupante && (
        <OcupanteForm
          campoId={campoId}
          periodoAEditar={periodoEnEdicion}
          onGuardado={() => {
            setMostrarFormularioOcupante(false);
            setPeriodoEnEdicion(null);
            cargarTodo();
          }}
          onCancelar={() => {
            setMostrarFormularioOcupante(false);
            setPeriodoEnEdicion(null);
          }}
        />
      )}

      {mostrarFormularioCampo && (
        <EditarCampoForm
          campo={campo}
          onGuardado={() => {
            setMostrarFormularioCampo(false);
            cargarTodo();
          }}
          onCancelar={() => setMostrarFormularioCampo(false)}
        />
      )}
    </div>
  );
}
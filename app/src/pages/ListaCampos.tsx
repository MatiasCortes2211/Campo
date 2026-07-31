import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Campo, Stock } from "../types/domain";
import { listarCamposDeGrupo, obtenerStockDeCampo } from "../services/campoService";
import { asegurarGrupoPorDefecto, GRUPO_POR_DEFECTO_ID } from "../db/seed";
import "./ListaCampos.css";
import { sincronizar } from "../services/syncService";

interface CampoConResumen extends Campo {
  totalCabezas: number;
}

export default function ListaCampos() {
  const [campos, setCampos] = useState<CampoConResumen[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      await asegurarGrupoPorDefecto();
      const lista = await listarCamposDeGrupo(GRUPO_POR_DEFECTO_ID);
      const conResumen = await Promise.all(
        lista.map(async (campo) => {
          const stock: Stock[] = await obtenerStockDeCampo(campo.id);
          const total = stock.reduce((acc, s) => acc + s.cantidadActual, 0);
          return { ...campo, totalCabezas: total };
        })
      );
      setCampos(conResumen);
      setCargando(false);
    })();
  }, []);

  const [sincronizando, setSincronizando] = useState(false);
  const [mensajeSync, setMensajeSync] = useState<string | null>(null);

  async function handleSincronizar() {
    setSincronizando(true);
    setMensajeSync(null);
    const resultado = await sincronizar(GRUPO_POR_DEFECTO_ID);
    setMensajeSync(resultado.mensaje);
    setSincronizando(false);
    const lista = await listarCamposDeGrupo(GRUPO_POR_DEFECTO_ID);
    const conResumen = await Promise.all(
      lista.map(async (campo) => {
        const stock: Stock[] = await obtenerStockDeCampo(campo.id);
        const total = stock.reduce((acc, s) => acc + s.cantidadActual, 0);
        return { ...campo, totalCabezas: total };
      })
    );
    setCampos(conResumen);
  }
  return (
    <div className="pantalla">
      <header className="encabezado">
        <h1>Mis campos</h1>
        <Link to="/campos/nuevo" className="boton boton-primario">
          + Nuevo campo
        </Link>
        <button className="boton boton-secundario" onClick={handleSincronizar} disabled={sincronizando}>
          {sincronizando ? "Sincronizando..." : "Sincronizar"}
        </button>
      </header>
      {mensajeSync && <p className="texto-mutado">{mensajeSync}</p>}

      {cargando && <p className="texto-mutado">Cargando...</p>}

      {!cargando && campos.length === 0 && (
        <div className="vacio">
          <p>Todavía no cargaste ningún campo.</p>
          <Link to="/campos/nuevo" className="boton boton-primario">
            Cargar el primero
          </Link>
        </div>
      )}

      <div className="lista-campos">
        {campos.map((campo) => (
          <Link to={`/campos/${campo.id}`} key={campo.id} className="card-campo">
            <div className="card-campo-header">
              <h2>{campo.nombre}</h2>
              <span className="badge">RENSPA {campo.renspa || "sin cargar"}</span>
            </div>
            <p className="texto-mutado">
              {campo.ubicacion} · {campo.hectareas} ha
            </p>
            <p className="total-cabezas">{campo.totalCabezas} cabezas</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

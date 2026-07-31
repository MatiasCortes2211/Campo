import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Campo, Stock } from "../types/domain";
import { listarCamposDeGrupo, obtenerStockDeCampo } from "../services/campoService";
import { getUsuarioActual, logout } from "../services/authService";
import { sincronizar } from "../services/syncService";
import "./ListaCampos.css";

interface CampoConResumen extends Campo {
  totalCabezas: number;
}

export default function ListaCampos() {
  const navigate = useNavigate();
  const usuario = getUsuarioActual();
  const [campos, setCampos] = useState<CampoConResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [mensajeSync, setMensajeSync] = useState<string | null>(null);

  async function cargarCampos() {
    if (!usuario) return;
    const lista = await listarCamposDeGrupo(usuario.grupoId);
    const conResumen = await Promise.all(
      lista.map(async (campo) => {
        const stock: Stock[] = await obtenerStockDeCampo(campo.id);
        const total = stock.reduce((acc, s) => acc + s.cantidadActual, 0);
        return { ...campo, totalCabezas: total };
      })
    );
    setCampos(conResumen);
  }

  useEffect(() => {
    cargarCampos().finally(() => setCargando(false));
  }, []);

  async function handleSincronizar() {
    if (!usuario) return;
    setSincronizando(true);
    setMensajeSync(null);
    const resultado = await sincronizar(usuario.grupoId);
    setMensajeSync(resultado.mensaje);
    setSincronizando(false);
    if (!resultado.ok && resultado.mensaje.includes("sesión venció")) {
      navigate("/login");
      return;
    }
    await cargarCampos();
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="pantalla">
      <header className="encabezado">
        <h1>Mis campos</h1>
        <div className="acciones-header">
          <Link to="/campos/nuevo" className="boton boton-primario">
            + Nuevo campo
          </Link>
          <button className="boton boton-secundario" onClick={handleSincronizar} disabled={sincronizando}>
            {sincronizando ? "Sincronizando..." : "Sincronizar"}
          </button>
        </div>
      </header>

      <div className="barra-usuario">
        <span className="texto-mutado">{usuario?.nombre}</span>
        <Link to="/cambiar-password" className="boton-link">
          Cambiar contraseña
        </Link>
        <button className="boton-link" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>

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
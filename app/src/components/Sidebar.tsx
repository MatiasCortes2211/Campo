import { useEffect, useState } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { listarCamposDeGrupo } from "../services/campoService";
import { getUsuarioActual, logout, type UsuarioActual } from "../services/authService";
import { actualizarNombrePropioEnTodosLosCampos } from "../services/ocupanteService";
import type { Campo } from "../types/domain";
import EditarNombreForm from "./EditarNombreForm";
import "./Sidebar.css";

interface Props {
  abierto: boolean;
  onCerrar: () => void;
}

export default function Sidebar({ abierto, onCerrar }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [usuario, setUsuario] = useState<UsuarioActual | null>(() => getUsuarioActual());
  const [campos, setCampos] = useState<Campo[]>([]);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [editandoNombre, setEditandoNombre] = useState(false);

  useEffect(() => {
    if (!usuario) return;
    listarCamposDeGrupo(usuario.grupoId).then(setCampos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <>
      <aside className={`sidebar ${abierto ? "sidebar-abierta" : ""}`}>
        <div className="sidebar-header">
          <span className="sidebar-logo">🐄</span>
          <span className="sidebar-titulo">Campo App</span>
        </div>

        <nav className="sidebar-nav">
            <NavLink
                to="/"
                end
                className={({ isActive }) => `sidebar-link sidebar-link-inicio ${isActive ? "sidebar-link-activo" : ""}`}
                onClick={onCerrar}
            >
                <span className="sidebar-link-icono">🏠</span>
                <span className="sidebar-link-texto">
                <span className="sidebar-link-nombre">Todos los campos</span>
                </span>
            </NavLink>
            <p className="sidebar-seccion-titulo">Mis campos</p>
          {campos.map((c) => (
            <NavLink
              key={c.id}
              to={`/campos/${c.id}`}
              className={({ isActive }) => `sidebar-link ${isActive ? "sidebar-link-activo" : ""}`}
              onClick={onCerrar}
            >
              <span className="sidebar-link-icono">{c.nombre.charAt(0).toUpperCase()}</span>
              <span className="sidebar-link-texto">
                <span className="sidebar-link-nombre">{c.nombre}</span>
                <span className="sidebar-link-sub">{c.hectareas} ha</span>
              </span>
            </NavLink>
          ))}
          <Link to="/campos/nuevo" className="sidebar-nuevo" onClick={onCerrar}>
            + Nuevo campo
          </Link>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-perfil" onClick={() => setMenuAbierto((v) => !v)}>
            <span className="sidebar-avatar">{usuario?.nombre.charAt(0).toUpperCase()}</span>
            <span className="sidebar-perfil-info">
              <span className="sidebar-perfil-nombre">{usuario?.nombre}</span>
              <span className="sidebar-perfil-rol">
                {usuario?.rol === "admin" ? "Administrador" : "Colaborador"}
              </span>
            </span>
          </button>

          {menuAbierto && (
            <div className="sidebar-menu">
              <button
                className="sidebar-menu-item"
                onClick={() => {
                  setEditandoNombre(true);
                  setMenuAbierto(false);
                }}
              >
                Editar nombre
              </button>
              <Link to="/cambiar-password" className="sidebar-menu-item" onClick={() => setMenuAbierto(false)}>
                Cambiar contraseña
              </Link>
              <button className="sidebar-menu-item sidebar-menu-item-peligro" onClick={handleLogout}>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </aside>

      {editandoNombre && usuario && (
        <EditarNombreForm
            nombreActual={usuario.nombre}
            onGuardado={async (usuarioActualizado) => {
            await actualizarNombrePropioEnTodosLosCampos(usuario.grupoId, usuario.nombre, usuarioActualizado.nombre);
            setUsuario(usuarioActualizado);
            setEditandoNombre(false);
            }}
            onCancelar={() => setEditandoNombre(false)}
        />
      )}
    </>
  );
}
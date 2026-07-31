import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cambiarPassword } from "../services/authService";
import "./ListaCampos.css";

export default function CambiarPassword() {
  const navigate = useNavigate();
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await cambiarPassword(passwordActual, passwordNueva);
      setOk(true);
      setTimeout(() => navigate("/"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cambiar la contraseña.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="pantalla">
      <header className="encabezado">
        <h1>Cambiar contraseña</h1>
      </header>
      <form className="formulario" onSubmit={handleSubmit}>
        <label>
          Contraseña actual
          <input
            type="password"
            value={passwordActual}
            onChange={(e) => setPasswordActual(e.target.value)}
            required
          />
        </label>
        <label>
          Contraseña nueva (mínimo 8 caracteres)
          <input
            type="password"
            value={passwordNueva}
            onChange={(e) => setPasswordNueva(e.target.value)}
            required
            minLength={8}
          />
        </label>
        {error && <p className="mensaje-error">{error}</p>}
        {ok && <p className="texto-mutado">Listo, contraseña actualizada.</p>}
        <button type="submit" className="boton boton-primario" disabled={guardando}>
          {guardando ? "Guardando..." : "Cambiar contraseña"}
        </button>
      </form>
    </div>
  );
}
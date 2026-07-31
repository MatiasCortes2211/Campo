import { useEffect, useRef, useState } from "react";
import { buscarLocalidades, type SugerenciaUbicacion } from "../services/ubicacionService";
import "./BuscadorUbicacion.css";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function BuscadorUbicacion({ value, onChange }: Props) {
  const [sugerencias, setSugerencias] = useState<SugerenciaUbicacion[]>([]);
  const [mostrarLista, setMostrarLista] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!navigator.onLine || value.trim().length < 3) {
      setSugerencias([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const resultados = await buscarLocalidades(value);
        setSugerencias(resultados);
      } catch {
        setSugerencias([]); // sin conexión o falla la API: se sigue escribiendo a mano, sin cortar el flujo
      } finally {
        setBuscando(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function seleccionar(s: SugerenciaUbicacion) {
    onChange(`${s.ciudad}, ${s.provincia}`);
    setSugerencias([]);
    setMostrarLista(false);
  }

  return (
    <div className="buscador-ubicacion">
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setMostrarLista(true);
        }}
        onFocus={() => setMostrarLista(true)}
        onBlur={() => setTimeout(() => setMostrarLista(false), 150)}
        placeholder="Empezá a escribir la ciudad..."
        autoComplete="off"
      />
      {buscando && <span className="buscador-spinner">Buscando...</span>}
      {mostrarLista && sugerencias.length > 0 && (
        <ul className="buscador-lista">
          {sugerencias.map((s, i) => (
            <li key={i} onMouseDown={() => seleccionar(s)}>
              {s.ciudad}, {s.provincia}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
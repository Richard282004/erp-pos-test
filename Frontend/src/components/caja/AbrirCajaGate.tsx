import { useEffect, useState } from "react";
import { listarCajas, abrirTurno, type Caja } from "../../api/caja";
import { useAuth } from "../../context/useAuth";

function mensajeError(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function AbrirCajaGate({ onAbierta }: { onAbierta: () => void }) {
  const { accessToken } = useAuth();
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [idCaja, setIdCaja] = useState<number | "">("");
  const [montoInicial, setMontoInicial] = useState<number>(0);
  const [abriendo, setAbriendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarCajas(accessToken)
      .then((data) => {
        setCajas(data);
        if (data.length === 1) setIdCaja(data[0].id_caja);
      })
      .catch((err) => setError(mensajeError(err, "No se pudieron cargar las cajas")));
  }, [accessToken]);

  const abrir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (idCaja === "") return;
    setError(null);
    setAbriendo(true);
    try {
      await abrirTurno(idCaja, montoInicial, accessToken);
      onAbierta();
    } catch (err) {
      setError(mensajeError(err, "No se pudo abrir la caja"));
    } finally {
      setAbriendo(false);
    }
  };

  return (
    <div className="caja-gate">
      <form className="caja-gate-card" onSubmit={abrir}>
        <div className="caja-gate-icono" aria-hidden="true">🔒</div>
        <h2>Caja cerrada</h2>
        <p>Abrí la caja para empezar a cobrar.</p>

        <label className="caja-field">
          <span>Caja</span>
          <select value={idCaja} onChange={(e) => setIdCaja(e.target.value ? Number(e.target.value) : "")} required>
            <option value="">— elegir caja —</option>
            {cajas.map((c) => (
              <option key={c.id_caja} value={c.id_caja}>
                {c.nombre}{c.sucursal ? ` · ${c.sucursal}` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="caja-field">
          <span>Monto inicial en efectivo</span>
          <input
            type="number"
            min={0}
            step="any"
            value={montoInicial}
            onChange={(e) => setMontoInicial(Number(e.target.value))}
          />
        </label>

        {error && <div className="login-error">{error}</div>}

        <button type="submit" className="caja-gate-btn" disabled={abriendo || idCaja === ""}>
          {abriendo ? "Abriendo…" : "Abrir caja"}
        </button>
      </form>
    </div>
  );
}

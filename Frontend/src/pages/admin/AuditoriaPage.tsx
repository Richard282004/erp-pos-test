import { useEffect, useState } from "react";
import { listarAuditoria, type EventoAuditoria } from "../../api/auditoria";
import { useAuth } from "../../context/useAuth";

function mensajeError(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

const ACCION_LEGIBLE: Record<string, string> = {
  ANULAR_PEDIDO: "Anuló pedido",
  BORRAR_DEFINITIVO: "Borró definitivamente",
};

function fechaHora(s: string) {
  return new Date(s).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "medium" });
}

export function AuditoriaPage() {
  const { accessToken } = useAuth();
  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarAuditoria(accessToken)
      .then(setEventos)
      .catch((err) => setError(mensajeError(err, "Error cargando la auditoría")))
      .finally(() => setLoading(false));
  }, [accessToken]);

  return (
    <div className="admin-modulo">
      <h2>Auditoría</h2>
      <p className="admin-ayuda">
        Quién anuló un pedido o borró algo definitivamente. Desactivar (no
        borrar) no queda acá — es reversible, se ve en cada módulo.
      </p>

      {loading ? (
        <div className="cargando">Cargando…</div>
      ) : error ? (
        <div className="error-productos">{error}</div>
      ) : eventos.length === 0 ? (
        <p className="admin-stub">Sin eventos todavía.</p>
      ) : (
        <table className="admin-tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Usuario</th>
              <th>Acción</th>
              <th>Sobre</th>
            </tr>
          </thead>
          <tbody>
            {eventos.map((e) => (
              <tr key={e.id_auditoria}>
                <td>{fechaHora(e.fecha)}</td>
                <td>{e.username}</td>
                <td>{ACCION_LEGIBLE[e.accion] ?? e.accion}</td>
                <td>
                  {e.entidad}
                  {e.id_entidad != null ? ` #${e.id_entidad}` : ""}
                  {e.detalle ? ` — ${e.detalle}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

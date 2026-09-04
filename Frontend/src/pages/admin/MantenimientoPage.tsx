import { useEffect, useState } from "react";
import {
  estadoMantenimiento,
  limpiarTransacciones,
  type EstadoMantenimiento,
} from "../../api/mantenimiento";
import { useAuth } from "../../context/useAuth";

function mensajeError(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

const ETIQUETA: Record<string, string> = {
  auditoria: "Auditoría",
  pedido_item_modificadores: "Modificadores de pedidos",
  pagos: "Pagos",
  pedido_items: "Ítems de pedidos",
  pedidos: "Pedidos",
  movimientos_caja: "Movimientos de caja",
  turnos_caja: "Turnos de caja",
  compra_detalles: "Detalles de compra",
  compras: "Compras",
  movimientos_inventario: "Movimientos de inventario",
};

const FRASE_CONFIRMACION = "BORRAR TODO";

export function MantenimientoPage() {
  const { accessToken } = useAuth();

  const [estado, setEstado] = useState<EstadoMantenimiento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [confirmando, setConfirmando] = useState(false);
  const [frase, setFrase] = useState("");
  const [borrando, setBorrando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);

  const cargar = () => {
    setLoading(true);
    setError(null);
    estadoMantenimiento(accessToken)
      .then(setEstado)
      .catch((err) => setError(mensajeError(err, "Error consultando el estado")))
      .finally(() => setLoading(false));
  };

  useEffect(cargar, [accessToken]);

  const ejecutar = async () => {
    setBorrando(true);
    setError(null);
    try {
      const r = await limpiarTransacciones(accessToken);
      setResultado(`Borradas ${r.total} filas. Insumos con stock y costo en cero.`);
      setConfirmando(false);
      setFrase("");
      cargar();
    } catch (err) {
      setError(mensajeError(err, "Error al borrar"));
    } finally {
      setBorrando(false);
    }
  };

  return (
    <div className="admin-modulo">
      <h2>Mantenimiento</h2>
      <p className="admin-ayuda">
        Borra el movimiento de la operación — pedidos, pagos, turnos de caja,
        compras y movimientos de inventario — para arrancar de cero. No toca
        productos, categorías, insumos, recetas, modificadores, usuarios,
        cajas ni sucursales.
      </p>

      {resultado && <div className="admin-ok" style={{ display: "block", marginBottom: 16 }}>{resultado}</div>}
      {error && <div className="admin-error">{error}</div>}

      {loading ? (
        <div className="cargando">Consultando…</div>
      ) : estado && estado.total === 0 ? (
        <p className="admin-stub">No hay transacciones para borrar. Ya está limpio.</p>
      ) : estado ? (
        <section className="mantenimiento-zona-peligro">
          <h3>Se va a borrar</h3>
          <ul>
            {Object.entries(estado.conteos).map(([tabla, n]) => (
              <li key={tabla}>
                {ETIQUETA[tabla] ?? tabla}: <strong>{n}</strong>
              </li>
            ))}
          </ul>
          <p>
            <strong>Total: {estado.total} filas.</strong> No se puede deshacer.
          </p>

          {!confirmando ? (
            <button className="admin-borrar-definitivo" onClick={() => setConfirmando(true)}>
              Borrar transacciones
            </button>
          ) : (
            <div className="mantenimiento-confirmar">
              <label>
                Escribí <strong>{FRASE_CONFIRMACION}</strong> para confirmar
                <input
                  value={frase}
                  onChange={(e) => setFrase(e.target.value)}
                  autoFocus
                  autoComplete="off"
                />
              </label>
              <div>
                <button
                  className="admin-borrar-definitivo"
                  disabled={frase !== FRASE_CONFIRMACION || borrando}
                  onClick={ejecutar}
                >
                  {borrando ? "Borrando…" : "Confirmar borrado"}
                </button>
                <button
                  onClick={() => {
                    setConfirmando(false);
                    setFrase("");
                  }}
                  style={{ marginLeft: 8 }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

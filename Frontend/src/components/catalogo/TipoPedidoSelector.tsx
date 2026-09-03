export type TipoPedido = "LOCAL" | "RETIRO" | "DELIVERY";

export function TipoPedidoSelector({
  tipoPedido,
  onChange,
}: {
  tipoPedido: TipoPedido;
  onChange: (t: TipoPedido) => void;
}) {
  return (
    <div className="tipo-pedido">
      <button
        className={tipoPedido === "LOCAL" ? "activo" : ""}
        onClick={() => onChange("LOCAL")}
      >
        🍽️ Consumo local
      </button>

      <button
        className={tipoPedido === "RETIRO" ? "activo" : ""}
        onClick={() => onChange("RETIRO")}
      >
        🏪 Retiro
      </button>

      <button
        className={tipoPedido === "DELIVERY" ? "activo" : ""}
        onClick={() => onChange("DELIVERY")}
      >
        🛵 Delivery
      </button>
    </div>
  );
}

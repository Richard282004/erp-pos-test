from datetime import date, datetime, timezone
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text

from app import auditoria
from app.auth import decode_token, get_current_user
from app.database import engine
from app.rbac import Rol, require_role
from app.routers.cajas import turno_abierto_de
from app.routers.usuarios import PROPOSITO_AUTORIZACION_DESCUENTO

router = APIRouter(prefix="/pedidos", tags=["Pedidos"])

TipoPedido = Literal["LOCAL", "RETIRO", "DELIVERY"]
MetodoPago = Literal["EFECTIVO", "DEBITO", "CREDITO", "TRANSFERENCIA"]
ESTADOS_VALIDOS = ("PENDIENTE", "PREPARANDO", "LISTO", "EN_REPARTO", "ENTREGADO", "CANCELADO")

# Un cajero podía poner 100% de descuento (por ítem o del pedido) y cobrar el
# efectivo real al cliente mientras el sistema registra una venta en $0: el
# arqueo de caja cierra "limpio" porque el total esperado coincide con el
# fraudulento. Por eso el descuento de un cajero queda topado acá; para
# descuentos mayores hace falta un supervisor o admin.
LIMITE_DESCUENTO_CAJERO = 20  # %


class PedidoItem(BaseModel):
    id_producto: int
    cantidad: int = Field(..., gt=0, le=999)
    descuento: float = Field(0, ge=0, le=100)
    modificadores: List[int] = Field(default_factory=list, max_length=20)


class PagoCrear(BaseModel):
    metodo_pago: MetodoPago
    monto_recibido: Optional[float] = Field(None, ge=0)
    referencia: Optional[str] = Field(None, max_length=120)


class PedidoCrear(BaseModel):
    tipo_pedido: TipoPedido
    nombre_cliente: Optional[str] = Field(None, max_length=120)
    telefono_cliente: Optional[str] = Field(None, max_length=40)
    descuento: float = Field(0, ge=0, le=100)
    observacion: Optional[str] = Field(None, max_length=500)
    items: List[PedidoItem] = Field(..., min_length=1, max_length=100)
    pago: Optional[PagoCrear] = None
    # Token de /usuarios/autorizar, cuando un supervisor/admin habilitó un
    # descuento por encima del tope del cajero.
    token_autorizacion: Optional[str] = Field(None, max_length=2000)


def _autorizacion_valida(token: str) -> dict:
    """Decodifica el token y confirma en la base que sigue siendo
    supervisor/admin activo — nunca se confía en lo que diga el token viejo."""
    payload = decode_token(token)
    if payload.get("proposito") != PROPOSITO_AUTORIZACION_DESCUENTO:
        raise HTTPException(status_code=403, detail="Token de autorización inválido")

    with engine.connect() as conn:
        fila = conn.execute(
            text("SELECT id_usuario, username, nombre, id_rol, activo FROM usuarios WHERE id_usuario = :id"),
            {"id": payload.get("user_id")},
        ).fetchone()
    if not fila:
        raise HTTPException(status_code=403, detail="Token de autorización inválido")
    autorizador = dict(fila._mapping)
    if not autorizador.get("activo") or autorizador["id_rol"] not in (Rol.ADMIN, Rol.SUPERVISOR):
        raise HTTPException(status_code=403, detail="Ese usuario ya no puede autorizar descuentos")
    return autorizador


@router.post("/")
def crear_pedido(pedido: PedidoCrear, user: dict = Depends(get_current_user)):
    id_usuario = user["id_usuario"]

    # Exigir un turno de caja abierto y usarlo.
    with engine.connect() as conn:
        turno = turno_abierto_de(conn, id_usuario)
        if not turno:
            raise HTTPException(
                status_code=409,
                detail="No hay una caja abierta. Abrí la caja antes de cobrar.",
            )
        id_turno = turno["id_turno"]

        id_sucursal = 1
        if turno.get("id_caja"):
            caja = conn.execute(
                text("SELECT id_sucursal FROM cajas WHERE id_caja = :c"),
                {"c": turno["id_caja"]},
            ).fetchone()
            if caja:
                id_sucursal = int(caja._mapping["id_sucursal"])

        # Precios actuales del servidor (nunca confiar en los del cliente).
        producto_ids = list({it.id_producto for it in pedido.items})
        precios_map = {
            int(f._mapping["id_producto"]): float(f._mapping["precio"])
            for f in conn.execute(
                text("SELECT id_producto, precio FROM productos WHERE id_producto = ANY(:ids) AND activo = TRUE"),
                {"ids": producto_ids},
            )
        }
        faltantes = set(producto_ids) - set(precios_map)
        if faltantes:
            raise HTTPException(
                status_code=400,
                detail=f"Productos inexistentes o inactivos: {sorted(faltantes)}",
            )

        mod_ids = list({m for it in pedido.items for m in it.modificadores})
        mods_map: dict[int, dict] = {}
        if mod_ids:
            for r in conn.execute(
                text(
                    "SELECT id_modificador, nombre, precio_adicional FROM modificadores "
                    "WHERE id_modificador = ANY(:ids) AND activo = TRUE"
                ),
                {"ids": mod_ids},
            ):
                mods_map[int(r._mapping["id_modificador"])] = {
                    "nombre": r._mapping["nombre"],
                    "precio_adicional": float(r._mapping["precio_adicional"]),
                }

    # Totales calculados por el servidor.
    subtotal_calc = 0.0
    descuento_items = 0.0
    for it in pedido.items:
        precio_unit = precios_map[it.id_producto]
        extra = sum(mods_map[m]["precio_adicional"] for m in it.modificadores if m in mods_map)
        linea = (precio_unit + extra) * it.cantidad
        subtotal_calc += linea
        descuento_items += linea * (it.descuento / 100.0)

    base = subtotal_calc - descuento_items
    descuento_pedido = base * (pedido.descuento / 100.0)
    total_calc = round(max(0.0, base - descuento_pedido), 2)
    descuento_total = round(descuento_items + descuento_pedido, 2)

    # Tope de descuento por rol. Se mide sobre el efecto real (item + pedido
    # combinados), no cada campo por separado, porque un 15% de línea más un
    # 15% de pedido ya compone más del 15% nominal. Un supervisor o admin
    # puede autorizarlo sin necesidad de cerrar la sesión del cajero.
    autorizador: dict | None = None
    if user.get("id_rol") == Rol.CAJERO and subtotal_calc > 0:
        descuento_efectivo_pct = (subtotal_calc - total_calc) / subtotal_calc * 100
        if descuento_efectivo_pct > LIMITE_DESCUENTO_CAJERO + 0.01:
            if not pedido.token_autorizacion:
                raise HTTPException(
                    status_code=403,
                    detail=(
                        f"El descuento supera el {LIMITE_DESCUENTO_CAJERO}% permitido "
                        "para cajero. Pedile a un supervisor o admin que lo autorice."
                    ),
                )
            autorizador = _autorizacion_valida(pedido.token_autorizacion)

    with engine.begin() as conn:
        id_pedido = conn.execute(
            text("""
                INSERT INTO pedidos (
                    id_sucursal, id_turno, id_usuario, tipo_pedido, estado,
                    nombre_cliente, telefono_cliente, subtotal, descuento, total, observacion
                )
                VALUES (
                    :id_sucursal, :id_turno, :id_usuario, :tipo_pedido, 'ENTREGADO',
                    :nombre_cliente, :telefono_cliente, :subtotal, :descuento, :total, :observacion
                )
                RETURNING id_pedido
            """),
            {
                "id_sucursal": id_sucursal,
                "id_turno": id_turno,
                "id_usuario": id_usuario,
                "tipo_pedido": pedido.tipo_pedido,
                "nombre_cliente": pedido.nombre_cliente,
                "telefono_cliente": pedido.telefono_cliente,
                "subtotal": round(subtotal_calc, 2),
                "descuento": descuento_total,
                "total": total_calc,
                "observacion": pedido.observacion,
            },
        ).scalar()

        if autorizador:
            pct = round((subtotal_calc - total_calc) / subtotal_calc * 100, 1) if subtotal_calc else 0
            auditoria.registrar(
                conn,
                {"id_usuario": autorizador["id_usuario"], "username": autorizador["username"]},
                "AUTORIZAR_DESCUENTO",
                "pedido",
                id_pedido,
                detalle=f"{pct}% de descuento — cajero {user['username']}",
            )

        for it in pedido.items:
            id_item = conn.execute(
                text("""
                    INSERT INTO pedido_items (id_pedido, id_producto, cantidad, precio, descuento)
                    VALUES (:id_pedido, :id_producto, :cantidad, :precio, :descuento)
                    RETURNING id_item
                """),
                {
                    "id_pedido": id_pedido,
                    "id_producto": it.id_producto,
                    "cantidad": it.cantidad,
                    "precio": precios_map[it.id_producto],
                    "descuento": it.descuento,
                },
            ).scalar()

            for m in it.modificadores:
                if m not in mods_map:
                    continue
                conn.execute(
                    text("""
                        INSERT INTO pedido_item_modificadores (id_item, id_modificador, nombre, precio_adicional)
                        VALUES (:i, :m, :n, :p)
                    """),
                    {"i": id_item, "m": m, "n": mods_map[m]["nombre"], "p": mods_map[m]["precio_adicional"]},
                )

        if pedido.pago:
            # El monto cobrado SIEMPRE es el total calculado por el servidor.
            recibido = pedido.pago.monto_recibido
            if recibido is None or recibido < total_calc:
                recibido = total_calc
            vuelto = round(recibido - total_calc, 2)
            conn.execute(
                text("""
                    INSERT INTO pagos (
                        id_pedido, id_turno, id_usuario, metodo_pago, monto,
                        monto_recibido, vuelto, referencia, fecha_pago
                    ) VALUES (
                        :id_pedido, :id_turno, :id_usuario, :metodo_pago, :monto,
                        :monto_recibido, :vuelto, :referencia, :fecha_pago
                    )
                """),
                {
                    "id_pedido": id_pedido,
                    "id_turno": id_turno,
                    "id_usuario": id_usuario,
                    "metodo_pago": pedido.pago.metodo_pago,
                    "monto": total_calc,
                    "monto_recibido": recibido,
                    "vuelto": vuelto,
                    "referencia": pedido.pago.referencia,
                    "fecha_pago": datetime.now(timezone.utc),
                },
            )

    return {"mensaje": "Pedido creado correctamente", "id_pedido": id_pedido, "total": total_calc}


@router.get("/")
def obtener_pedidos(
    id_turno: Optional[int] = None,
    estado: Optional[str] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    limite: int = 200,
    user: dict = Depends(get_current_user),
):
    if estado and estado not in ESTADOS_VALIDOS:
        raise HTTPException(status_code=400, detail="estado inválido")

    condiciones = []
    params: dict = {"lim": min(max(limite, 1), 1000)}
    # El cajero ve solo sus propias ventas: nombre y teléfono de clientes de
    # otros turnos no son asunto suyo. Admin y supervisor ven todo.
    if user.get("id_rol") == Rol.CAJERO:
        condiciones.append("p.id_usuario = :id_usuario_propio")
        params["id_usuario_propio"] = user["id_usuario"]
    if id_turno is not None:
        condiciones.append("p.id_turno = :id_turno")
        params["id_turno"] = id_turno
    if estado:
        condiciones.append("COALESCE(p.estado, '') = :estado")
        params["estado"] = estado
    if desde:
        condiciones.append("p.fecha_creacion >= :desde")
        params["desde"] = desde
    if hasta:
        condiciones.append("p.fecha_creacion < (CAST(:hasta AS date) + INTERVAL '1 day')")
        params["hasta"] = hasta
    where = ("WHERE " + " AND ".join(condiciones)) if condiciones else ""

    with engine.connect() as conn:
        pedidos = [
            dict(f._mapping)
            for f in conn.execute(
                text(f"""
                    SELECT p.id_pedido, p.id_sucursal, p.id_turno, p.id_usuario, u.username,
                           p.tipo_pedido, p.estado, p.nombre_cliente, p.telefono_cliente,
                           p.subtotal, p.descuento, p.total, p.observacion, p.fecha_creacion
                    FROM pedidos p
                    LEFT JOIN usuarios u ON u.id_usuario = p.id_usuario
                    {where}
                    ORDER BY p.id_pedido DESC
                    LIMIT :lim
                """),
                params,
            )
        ]

        ids = [p["id_pedido"] for p in pedidos]
        if ids:
            pagos_map = {
                int(r._mapping["id_pedido"]): float(r._mapping["monto"])
                for r in conn.execute(
                    text("""
                        SELECT id_pedido, COALESCE(SUM(monto), 0) AS monto
                        FROM pagos WHERE id_pedido = ANY(:ids)
                        GROUP BY id_pedido
                    """),
                    {"ids": ids},
                )
            }
            for p in pedidos:
                p["pagos_monto"] = pagos_map.get(p["id_pedido"], 0.0)

    return pedidos


@router.post("/{id_pedido}/anular")
def anular_pedido(id_pedido: int, user: dict = Depends(require_role(Rol.ADMIN, Rol.SUPERVISOR))):
    with engine.begin() as conn:
        ped = conn.execute(
            text("SELECT estado FROM pedidos WHERE id_pedido = :id"), {"id": id_pedido}
        ).fetchone()
        if not ped:
            raise HTTPException(status_code=404, detail="Pedido no encontrado")
        if (ped._mapping["estado"] or "") == "CANCELADO":
            raise HTTPException(status_code=400, detail="El pedido ya está anulado")

        conn.execute(
            text("""
                UPDATE pedidos
                SET estado = 'CANCELADO',
                    observacion = TRIM(COALESCE(observacion, '') || ' [anulado por ' || :u || ']')
                WHERE id_pedido = :id
            """),
            {"id": id_pedido, "u": user["username"]},
        )
        auditoria.registrar(conn, user, "ANULAR_PEDIDO", "pedido", id_pedido)
    return {"mensaje": "Pedido anulado"}


@router.get("/{id_pedido}")
def obtener_pedido_detalle(id_pedido: int, user: dict = Depends(get_current_user)):
    with engine.connect() as conn:
        ped = conn.execute(
            text("""
                SELECT p.*, u.username, s.nombre AS sucursal
                FROM pedidos p
                LEFT JOIN usuarios u ON u.id_usuario = p.id_usuario
                LEFT JOIN sucursales s ON s.id_sucursal = p.id_sucursal
                WHERE p.id_pedido = :id
            """),
            {"id": id_pedido},
        ).fetchone()
        if not ped:
            raise HTTPException(status_code=404, detail="Pedido no encontrado")
        pedido = dict(ped._mapping)

        if user.get("id_rol") == Rol.CAJERO and pedido.get("id_usuario") != user["id_usuario"]:
            raise HTTPException(status_code=403, detail="Ese pedido no es de tu turno")

        items = [
            dict(r._mapping)
            for r in conn.execute(
                text("""
                    SELECT pi.id_item, pi.id_producto, pi.cantidad, pi.precio, pi.descuento,
                           p.nombre AS nombre_producto
                    FROM pedido_items pi
                    LEFT JOIN productos p ON p.id_producto = pi.id_producto
                    WHERE pi.id_pedido = :id
                    ORDER BY pi.id_item
                """),
                {"id": id_pedido},
            )
        ]
        if items:
            mods_por_item: dict[int, list] = {}
            for r in conn.execute(
                text("""
                    SELECT id_item, nombre, precio_adicional
                    FROM pedido_item_modificadores
                    WHERE id_item = ANY(:ids) ORDER BY id
                """),
                {"ids": [i["id_item"] for i in items]},
            ):
                mods_por_item.setdefault(int(r._mapping["id_item"]), []).append(
                    {"nombre": r._mapping["nombre"], "precio_adicional": float(r._mapping["precio_adicional"])}
                )
            for i in items:
                i["modificadores"] = mods_por_item.get(i["id_item"], [])
        pedido["items"] = items

        pedido["pagos"] = [
            dict(r._mapping)
            for r in conn.execute(
                text("""
                    SELECT id_pago, id_pedido, id_turno, id_usuario, metodo_pago, monto,
                           monto_recibido, vuelto, referencia, fecha_pago
                    FROM pagos WHERE id_pedido = :id ORDER BY fecha_pago
                """),
                {"id": id_pedido},
            )
        ]

    return pedido

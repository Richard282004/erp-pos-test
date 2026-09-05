from datetime import date, datetime, timezone
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

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
    # Identificador único del intento de cobro. Si la red se corta después de
    # guardar y el cajero reintenta, la misma clave devuelve el pedido ya
    # creado en lugar de duplicarlo.
    idempotency_key: Optional[str] = Field(None, min_length=8, max_length=64)


def _autorizacion_valida(token: str, id_cajero: int, desc_efectivo_pct: float) -> dict:
    """Valida el token de autorización de descuento y lo devuelve decodificado.

    Comprueba: propósito correcto, que el autorizador siga siendo
    supervisor/admin activo (nunca se confía en el rol que trae el token),
    que el token se le concedió a ESTE cajero, y que el descuento real no
    supera el techo autorizado. El consumo de un solo uso (jti) se hace
    aparte, ya dentro de la transacción que crea el pedido.
    """
    payload = decode_token(token)
    if payload.get("proposito") != PROPOSITO_AUTORIZACION_DESCUENTO:
        raise HTTPException(status_code=403, detail="Token de autorización inválido")
    if not payload.get("jti"):
        raise HTTPException(status_code=403, detail="Token de autorización sin identificador")
    if payload.get("sol") != id_cajero:
        raise HTTPException(
            status_code=403,
            detail="Esa autorización se emitió para otra caja.",
        )
    techo = float(payload.get("max_desc_pct") or 0)
    if desc_efectivo_pct > techo + 0.5:
        raise HTTPException(
            status_code=403,
            detail=(
                f"Se autorizó hasta {techo:.1f}% y el descuento es {desc_efectivo_pct:.1f}%. "
                "Pedí una autorización nueva por el monto correcto."
            ),
        )

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
    autorizador["jti"] = payload["jti"]
    return autorizador


def _ticket_de_pedido(conn, id_pedido: int) -> dict:
    """Arma la respuesta de cobro a partir de lo que quedó guardado."""
    p = conn.execute(
        text("SELECT id_pedido, fecha_creacion, subtotal, descuento, total FROM pedidos WHERE id_pedido = :id"),
        {"id": id_pedido},
    ).fetchone()._mapping
    pg = conn.execute(
        text("SELECT metodo_pago, monto, monto_recibido, vuelto FROM pagos WHERE id_pedido = :id ORDER BY id_pago LIMIT 1"),
        {"id": id_pedido},
    ).fetchone()
    return {
        "mensaje": "Pedido creado correctamente",
        "id_pedido": int(p["id_pedido"]),
        "fecha": p["fecha_creacion"].isoformat() if p["fecha_creacion"] else None,
        "subtotal": float(p["subtotal"]),
        "descuento": float(p["descuento"]),
        "total": float(p["total"]),
        "pago": (
            {
                "metodo_pago": pg._mapping["metodo_pago"],
                "monto": float(pg._mapping["monto"]),
                "monto_recibido": float(pg._mapping["monto_recibido"]) if pg._mapping["monto_recibido"] is not None else None,
                "vuelto": float(pg._mapping["vuelto"]) if pg._mapping["vuelto"] is not None else None,
            }
            if pg
            else None
        ),
    }


@router.post("/")
def crear_pedido(pedido: PedidoCrear, user: dict = Depends(get_current_user)):
    id_usuario = user["id_usuario"]

    # Reintento de un cobro ya guardado: se devuelve el mismo pedido.
    if pedido.idempotency_key:
        with engine.connect() as conn:
            ya = conn.execute(
                text("SELECT id_pedido FROM pedidos_idempotencia WHERE clave = :k"),
                {"k": pedido.idempotency_key},
            ).scalar()
            if ya:
                return _ticket_de_pedido(conn, int(ya))

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

    # Efectivo: el monto recibido es obligatorio y no puede ser menor al total.
    # Sin esto se podía cobrar en efectivo sin registrar cuánto entregó el cliente.
    if pedido.pago and pedido.pago.metodo_pago == "EFECTIVO":
        recibido_efectivo = pedido.pago.monto_recibido
        if recibido_efectivo is None or round(recibido_efectivo, 2) < total_calc:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Para cobrar en efectivo hay que ingresar el monto recibido, "
                    "y no puede ser menor al total."
                ),
            )

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
            autorizador = _autorizacion_valida(
                pedido.token_autorizacion, id_usuario, descuento_efectivo_pct
            )

    with engine.begin() as conn:
        # Se relee el turno con bloqueo dentro de la misma transacción que
        # inserta el pedido y el pago. Así, si un supervisor está cerrando el
        # turno al mismo tiempo, una de las dos operaciones espera a la otra:
        # o la venta entra antes del cierre, o se rechaza con la caja cerrada.
        # Nunca queda una venta "colgada" fuera del arqueo.
        turno_lock = conn.execute(
            text("SELECT estado FROM turnos_caja WHERE id_turno = :t FOR UPDATE"),
            {"t": id_turno},
        ).fetchone()
        if not turno_lock or turno_lock._mapping["estado"] != "ABIERTO":
            raise HTTPException(
                status_code=409,
                detail="La caja se cerró. No se puede cobrar en este turno.",
            )

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
            # Consumo de un solo uso: si este jti ya se usó, el INSERT choca
            # con la PK. El SAVEPOINT contiene el error para poder responder
            # limpio; al salir por excepción, la transacción entera se revierte
            # y el pedido no llega a crearse.
            try:
                with conn.begin_nested():
                    conn.execute(
                        text(
                            "INSERT INTO autorizaciones_usadas (jti, id_usuario, id_pedido) "
                            "VALUES (:jti, :u, :p)"
                        ),
                        {"jti": autorizador["jti"], "u": autorizador["id_usuario"], "p": id_pedido},
                    )
            except IntegrityError:
                raise HTTPException(
                    status_code=409,
                    detail="Esa autorización ya se usó. Pedí una nueva.",
                )
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

        pago_out = None
        if pedido.pago:
            # El monto cobrado SIEMPRE es el total calculado por el servidor.
            recibido = pedido.pago.monto_recibido
            if recibido is None or recibido < total_calc:
                recibido = total_calc
            vuelto = round(recibido - total_calc, 2)
            pago_out = {
                "metodo_pago": pedido.pago.metodo_pago,
                "monto": total_calc,
                "monto_recibido": round(recibido, 2),
                "vuelto": vuelto,
            }
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

        if pedido.idempotency_key:
            # Marca del intento. Dos requests simultáneos con la misma clave:
            # el segundo choca con la PK, su transacción entera se revierte (el
            # pedido que alcanzó a crear se descarta) y recibe un 409. Al
            # reintentar, el pre-chequeo del arranque le devuelve el ganador.
            try:
                with conn.begin_nested():
                    conn.execute(
                        text(
                            "INSERT INTO pedidos_idempotencia (clave, id_pedido, id_usuario) "
                            "VALUES (:k, :p, :u)"
                        ),
                        {"k": pedido.idempotency_key, "p": id_pedido, "u": id_usuario},
                    )
            except IntegrityError:
                raise HTTPException(
                    status_code=409,
                    detail="Ese cobro ya se está procesando. Esperá el ticket.",
                )

    # Se devuelve lo que quedó guardado para que el ticket se imprima con los
    # números del servidor y no con lo que había en pantalla.
    return {
        "mensaje": "Pedido creado correctamente",
        "id_pedido": id_pedido,
        "fecha": datetime.now(timezone.utc).isoformat(),
        "subtotal": round(subtotal_calc, 2),
        "descuento": descuento_total,
        "total": total_calc,
        "pago": pago_out,
    }


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

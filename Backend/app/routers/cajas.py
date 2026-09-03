from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime, timezone
from sqlalchemy import text

from app.database import engine
from app.auth import get_current_user
from app.rbac import Rol, require_role

router = APIRouter(prefix="/caja", tags=["Caja"])

_GESTOR = require_role(Rol.ADMIN, Rol.SUPERVISOR)

TIPOS_MOV = ("RETIRO", "INGRESO", "GASTO")


def _resumen_turno(conn, id_turno: int) -> dict:
    """Totales del turno: ventas por método, cantidad de pedidos, movimientos, efectivo esperado."""
    turno = conn.execute(
        text("SELECT * FROM turnos_caja WHERE id_turno = :t"), {"t": id_turno}
    ).fetchone()
    if not turno:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    turno = dict(turno._mapping)

    pagos = [
        {"metodo_pago": r._mapping["metodo_pago"], "total": float(r._mapping["total"])}
        for r in conn.execute(
            text("""
                SELECT pg.metodo_pago, COALESCE(SUM(pg.monto), 0) AS total
                FROM pagos pg
                JOIN pedidos p ON p.id_pedido = pg.id_pedido
                WHERE pg.id_turno = :t AND COALESCE(p.estado, '') <> 'CANCELADO'
                GROUP BY pg.metodo_pago
                ORDER BY pg.metodo_pago
            """),
            {"t": id_turno},
        )
    ]
    efectivo_ventas = sum(p["total"] for p in pagos if p["metodo_pago"] == "EFECTIVO")

    ped = conn.execute(
        text("""
            SELECT COUNT(*) AS n, COALESCE(SUM(total), 0) AS monto
            FROM pedidos
            WHERE id_turno = :t AND COALESCE(estado, '') <> 'CANCELADO'
        """),
        {"t": id_turno},
    ).fetchone()

    movs = [
        dict(r._mapping)
        for r in conn.execute(
            text("""
                SELECT id_movimiento, tipo_movimiento, monto, motivo, fecha_movimiento
                FROM movimientos_caja WHERE id_turno = :t ORDER BY id_movimiento
            """),
            {"t": id_turno},
        )
    ]
    ingresos = sum(float(m["monto"]) for m in movs if m["tipo_movimiento"] == "INGRESO")
    retiros = sum(float(m["monto"]) for m in movs if m["tipo_movimiento"] == "RETIRO")
    gastos = sum(float(m["monto"]) for m in movs if m["tipo_movimiento"] == "GASTO")

    monto_inicial = float(turno["monto_inicial"] or 0)
    efectivo_esperado = monto_inicial + efectivo_ventas + ingresos - retiros - gastos

    return {
        "turno": turno,
        "pagos": pagos,
        "pedidos_cantidad": int(ped._mapping["n"]),
        "pedidos_monto": float(ped._mapping["monto"]),
        "movimientos": movs,
        "movimientos_ingresos": ingresos,
        "movimientos_retiros": retiros,
        "movimientos_gastos": gastos,
        "monto_inicial": monto_inicial,
        "efectivo_ventas": efectivo_ventas,
        "efectivo_esperado": efectivo_esperado,
    }


def turno_abierto_de(conn, id_usuario: int) -> Optional[dict]:
    fila = conn.execute(
        text("""
            SELECT * FROM turnos_caja
            WHERE id_usuario = :u AND estado = 'ABIERTO'
            ORDER BY id_turno DESC LIMIT 1
        """),
        {"u": id_usuario},
    ).fetchone()
    return dict(fila._mapping) if fila else None


def _turno_o_403(conn, id_turno: int, user: dict) -> dict:
    """Devuelve el turno si el usuario es su dueño o es admin/supervisor; si no, 403/404."""
    fila = conn.execute(
        text("SELECT id_turno, id_usuario, estado FROM turnos_caja WHERE id_turno = :t"),
        {"t": id_turno},
    ).fetchone()
    if not fila:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    turno = dict(fila._mapping)
    if turno["id_usuario"] != user["id_usuario"] and user.get("id_rol") not in (Rol.ADMIN, Rol.SUPERVISOR):
        raise HTTPException(status_code=403, detail="Ese turno no es tuyo")
    return turno


# --------------------------------------------------------------------------- #

@router.get("/cajas")
def listar_cajas(incluir_inactivas: bool = False, user: dict = Depends(get_current_user)):
    condiciones = []
    params: dict = {}
    if not incluir_inactivas:
        condiciones.append("c.activo = TRUE")
    # El cajero solo ve las cajas de su sucursal; admin/supervisor ven todas.
    if user.get("id_rol") == Rol.CAJERO and user.get("id_sucursal"):
        condiciones.append("c.id_sucursal = :suc")
        params["suc"] = user["id_sucursal"]
    where = ("WHERE " + " AND ".join(condiciones)) if condiciones else ""

    with engine.connect() as conn:
        filas = conn.execute(
            text(f"""
                SELECT c.id_caja, c.nombre, c.id_sucursal, s.nombre AS sucursal, c.activo
                FROM cajas c
                LEFT JOIN sucursales s ON s.id_sucursal = c.id_sucursal
                {where}
                ORDER BY s.nombre, c.nombre
            """),
            params,
        )
        return [dict(f._mapping) for f in filas]


class CajaInput(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=80)
    id_sucursal: int


@router.post("/cajas", status_code=201)
def crear_caja(payload: CajaInput, _: dict = Depends(require_role(Rol.ADMIN))):
    with engine.connect() as conn:
        suc = conn.execute(
            text("SELECT 1 FROM sucursales WHERE id_sucursal = :s AND activo = TRUE"),
            {"s": payload.id_sucursal},
        ).fetchone()
    if not suc:
        raise HTTPException(status_code=400, detail="Sucursal inexistente o inactiva")

    with engine.begin() as conn:
        fila = conn.execute(
            text("""
                INSERT INTO cajas (id_sucursal, nombre)
                VALUES (:s, :n)
                RETURNING id_caja, nombre, id_sucursal, activo
            """),
            {"s": payload.id_sucursal, "n": payload.nombre},
        ).fetchone()
    return dict(fila._mapping)


@router.put("/cajas/{id_caja}")
def actualizar_caja(id_caja: int, payload: CajaInput, _: dict = Depends(require_role(Rol.ADMIN))):
    with engine.connect() as conn:
        existe = conn.execute(
            text("SELECT 1 FROM cajas WHERE id_caja = :c"), {"c": id_caja}
        ).fetchone()
        suc = conn.execute(
            text("SELECT 1 FROM sucursales WHERE id_sucursal = :s"),
            {"s": payload.id_sucursal},
        ).fetchone()
    if not existe:
        raise HTTPException(status_code=404, detail="Caja no encontrada")
    if not suc:
        raise HTTPException(status_code=400, detail="Sucursal inexistente")

    with engine.begin() as conn:
        fila = conn.execute(
            text("""
                UPDATE cajas SET nombre = :n, id_sucursal = :s
                WHERE id_caja = :c
                RETURNING id_caja, nombre, id_sucursal, activo
            """),
            {"n": payload.nombre, "s": payload.id_sucursal, "c": id_caja},
        ).fetchone()
    return dict(fila._mapping)


@router.delete("/cajas/{id_caja}")
def desactivar_caja(id_caja: int, _: dict = Depends(require_role(Rol.ADMIN))):
    with engine.begin() as conn:
        existe = conn.execute(
            text("SELECT 1 FROM cajas WHERE id_caja = :c"), {"c": id_caja}
        ).fetchone()
        if not existe:
            raise HTTPException(status_code=404, detail="Caja no encontrada")

        abierta = conn.execute(
            text("SELECT 1 FROM turnos_caja WHERE id_caja = :c AND estado = 'ABIERTO'"),
            {"c": id_caja},
        ).fetchone()
        if abierta:
            raise HTTPException(status_code=409, detail="La caja tiene un turno abierto")

        conn.execute(text("UPDATE cajas SET activo = FALSE WHERE id_caja = :c"), {"c": id_caja})
    return {"mensaje": "Caja eliminada"}


@router.post("/cajas/{id_caja}/reactivar")
def reactivar_caja(id_caja: int, _: dict = Depends(require_role(Rol.ADMIN))):
    with engine.connect() as conn:
        existe = conn.execute(
            text("SELECT 1 FROM cajas WHERE id_caja = :c"), {"c": id_caja}
        ).fetchone()
    if not existe:
        raise HTTPException(status_code=404, detail="Caja no encontrada")
    with engine.begin() as conn:
        fila = conn.execute(
            text("""
                UPDATE cajas SET activo = TRUE WHERE id_caja = :c
                RETURNING id_caja, nombre, id_sucursal, activo
            """),
            {"c": id_caja},
        ).fetchone()
    return dict(fila._mapping)


@router.get("/turno-actual")
def turno_actual(user: dict = Depends(get_current_user)):
    with engine.connect() as conn:
        turno = turno_abierto_de(conn, user["id_usuario"])
        if not turno:
            return None
        return _resumen_turno(conn, turno["id_turno"])


class AbrirTurno(BaseModel):
    id_caja: int
    monto_inicial: float = Field(0, ge=0, le=99_999_999)


@router.post("/turnos", status_code=201)
def abrir_turno(payload: AbrirTurno, user: dict = Depends(get_current_user)):
    with engine.begin() as conn:
        if turno_abierto_de(conn, user["id_usuario"]):
            raise HTTPException(status_code=409, detail="Ya tenés un turno abierto")

        caja = conn.execute(
            text("SELECT 1 FROM cajas WHERE id_caja = :c AND activo = TRUE"),
            {"c": payload.id_caja},
        ).fetchone()
        if not caja:
            raise HTTPException(status_code=400, detail="Caja inexistente o inactiva")

        ocupada = conn.execute(
            text("SELECT 1 FROM turnos_caja WHERE id_caja = :c AND estado = 'ABIERTO'"),
            {"c": payload.id_caja},
        ).fetchone()
        if ocupada:
            raise HTTPException(status_code=409, detail="Esa caja ya tiene un turno abierto")

        id_turno = conn.execute(
            text("""
                INSERT INTO turnos_caja (id_caja, id_usuario, monto_inicial, estado)
                VALUES (:c, :u, :m, 'ABIERTO')
                RETURNING id_turno
            """),
            {"c": payload.id_caja, "u": user["id_usuario"], "m": payload.monto_inicial},
        ).scalar()

    return {"id_turno": id_turno}


class MovimientoCaja(BaseModel):
    tipo_movimiento: Literal["RETIRO", "INGRESO", "GASTO"]
    monto: float = Field(..., gt=0, le=99_999_999)
    motivo: str = Field(..., min_length=1, max_length=200)


@router.post("/turnos/{id_turno}/movimientos", status_code=201)
def registrar_movimiento_caja(
    id_turno: int, payload: MovimientoCaja, user: dict = Depends(get_current_user)
):
    with engine.begin() as conn:
        turno = _turno_o_403(conn, id_turno, user)
        if turno["estado"] != "ABIERTO":
            raise HTTPException(status_code=400, detail="El turno está cerrado")

        conn.execute(
            text("""
                INSERT INTO movimientos_caja (id_turno, id_usuario, tipo_movimiento, monto, motivo)
                VALUES (:t, :u, :tipo, :monto, :motivo)
            """),
            {
                "t": id_turno,
                "u": user["id_usuario"],
                "tipo": payload.tipo_movimiento,
                "monto": payload.monto,
                "motivo": payload.motivo,
            },
        )
    return {"mensaje": "Movimiento registrado"}


class CerrarTurno(BaseModel):
    efectivo_contado: float = Field(..., ge=0, le=999_999_999)


@router.post("/turnos/{id_turno}/cerrar")
def cerrar_turno(id_turno: int, payload: CerrarTurno, user: dict = Depends(get_current_user)):
    with engine.begin() as conn:
        turno = _turno_o_403(conn, id_turno, user)
        if turno["estado"] != "ABIERTO":
            raise HTTPException(status_code=400, detail="El turno ya está cerrado")

        resumen = _resumen_turno(conn, id_turno)
        esperado = resumen["efectivo_esperado"]
        diferencia = payload.efectivo_contado - esperado

        conn.execute(
            text("""
                UPDATE turnos_caja
                SET fecha_cierre = :ahora,
                    efectivo_contado = :contado,
                    efectivo_esperado = :esperado,
                    diferencia = :dif,
                    estado = 'CERRADO'
                WHERE id_turno = :t
            """),
            {
                "ahora": datetime.now(timezone.utc),
                "contado": payload.efectivo_contado,
                "esperado": esperado,
                "dif": diferencia,
                "t": id_turno,
            },
        )

    return {
        "efectivo_esperado": esperado,
        "efectivo_contado": payload.efectivo_contado,
        "diferencia": diferencia,
    }


@router.get("/turnos/{id_turno}/corte")
def corte_z(id_turno: int, user: dict = Depends(get_current_user)):
    with engine.connect() as conn:
        _turno_o_403(conn, id_turno, user)
        return _resumen_turno(conn, id_turno)


@router.get("/turnos")
def listar_turnos(_: dict = Depends(_GESTOR)):
    with engine.connect() as conn:
        filas = conn.execute(text("""
            SELECT t.id_turno, t.id_caja, c.nombre AS caja, t.id_usuario, u.username,
                   t.monto_inicial, t.fecha_apertura, t.fecha_cierre,
                   t.efectivo_contado, t.efectivo_esperado, t.diferencia, t.estado
            FROM turnos_caja t
            LEFT JOIN cajas c ON c.id_caja = t.id_caja
            LEFT JOIN usuarios u ON u.id_usuario = t.id_usuario
            ORDER BY t.id_turno DESC
        """))
        return [dict(f._mapping) for f in filas]

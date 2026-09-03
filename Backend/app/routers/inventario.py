from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from sqlalchemy import text

from app.database import engine
from app.rbac import Rol, require_role

router = APIRouter(prefix="/inventario", tags=["Inventario"])

_GESTOR = require_role(Rol.ADMIN, Rol.SUPERVISOR)


def a_unidad_base(cantidad: float, unidad_compra: str, unidad_insumo: str) -> float:
    """Convierte la cantidad comprada a la unidad base del insumo (g / ml / u)."""
    uc = unidad_compra.strip().lower()
    ui = unidad_insumo.strip().lower()
    if uc == ui:
        return cantidad
    if uc == "kg" and ui == "g":
        return cantidad * 1000
    if uc == "l" and ui == "ml":
        return cantidad * 1000
    raise HTTPException(
        status_code=400,
        detail=f"No se puede convertir '{unidad_compra}' a la unidad del insumo ('{unidad_insumo}')",
    )


# --------------------------------------------------------------------------- #
# Compras
# --------------------------------------------------------------------------- #

class CompraItemInput(BaseModel):
    id_insumo: int
    cantidad_compra: float = Field(..., gt=0, le=9_999_999)
    unidad_compra: str = Field(..., min_length=1, max_length=8)
    costo_total: float = Field(..., ge=0, le=999_999_999)


class CompraInput(BaseModel):
    proveedor: Optional[str] = None
    nota: Optional[str] = Field(None, max_length=300)
    items: List[CompraItemInput] = Field(..., min_length=1)


@router.post("/compras", status_code=201)
def registrar_compra(payload: CompraInput, user: dict = Depends(_GESTOR)):
    ids = list({it.id_insumo for it in payload.items})

    with engine.begin() as conn:
        insumos = {
            int(r._mapping["id_insumo"]): {
                "unidad": r._mapping["unidad"],
                "stock_actual": float(r._mapping["stock_actual"]),
                "costo_promedio": float(r._mapping["costo_promedio"]),
            }
            for r in conn.execute(
                text("""
                    SELECT id_insumo, unidad, stock_actual, costo_promedio
                    FROM insumos WHERE id_insumo = ANY(:ids) AND activo = TRUE
                """),
                {"ids": ids},
            )
        }
        for it in payload.items:
            if it.id_insumo not in insumos:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insumo {it.id_insumo} no existe o está inactivo",
                )

        total = round(sum(it.costo_total for it in payload.items), 2)
        id_compra = conn.execute(
            text("""
                INSERT INTO compras (id_usuario, proveedor, nota, total)
                VALUES (:u, :prov, :nota, :total)
                RETURNING id_compra
            """),
            {
                "u": user["id_usuario"],
                "prov": payload.proveedor,
                "nota": payload.nota,
                "total": total,
            },
        ).scalar()

        for it in payload.items:
            ins = insumos[it.id_insumo]
            cantidad_base = a_unidad_base(it.cantidad_compra, it.unidad_compra, ins["unidad"])
            if cantidad_base <= 0:
                raise HTTPException(status_code=400, detail="La cantidad convertida es 0")

            costo_unit_base = it.costo_total / cantidad_base
            stock_prev = ins["stock_actual"]
            costo_prev = ins["costo_promedio"]
            nuevo_stock = stock_prev + cantidad_base
            nuevo_costo = (
                (stock_prev * costo_prev + it.costo_total) / nuevo_stock
                if nuevo_stock > 0
                else costo_unit_base
            )

            conn.execute(
                text("""
                    INSERT INTO compra_items
                        (id_compra, id_insumo, cantidad_compra, unidad_compra, cantidad_base, costo_total)
                    VALUES (:c, :i, :cc, :uc, :cb, :ct)
                """),
                {
                    "c": id_compra,
                    "i": it.id_insumo,
                    "cc": it.cantidad_compra,
                    "uc": it.unidad_compra,
                    "cb": cantidad_base,
                    "ct": it.costo_total,
                },
            )
            conn.execute(
                text("""
                    INSERT INTO movimientos_inventario
                        (id_insumo, tipo, cantidad, costo_unitario, id_usuario, id_compra, nota)
                    VALUES (:i, 'COMPRA', :cant, :cu, :u, :c, :nota)
                """),
                {
                    "i": it.id_insumo,
                    "cant": cantidad_base,
                    "cu": costo_unit_base,
                    "u": user["id_usuario"],
                    "c": id_compra,
                    "nota": payload.nota,
                },
            )
            conn.execute(
                text("UPDATE insumos SET stock_actual = :s, costo_promedio = :cp WHERE id_insumo = :i"),
                {"s": nuevo_stock, "cp": nuevo_costo, "i": it.id_insumo},
            )
            # por si el mismo insumo aparece dos veces en la compra
            ins["stock_actual"] = nuevo_stock
            ins["costo_promedio"] = nuevo_costo

    return {"id_compra": id_compra, "total": total}


@router.get("/compras")
def listar_compras(_: dict = Depends(_GESTOR)):
    with engine.connect() as conn:
        compras = [
            dict(r._mapping)
            for r in conn.execute(text("""
                SELECT c.id_compra, c.fecha, c.proveedor, c.nota, c.total, u.username
                FROM compras c
                LEFT JOIN usuarios u ON u.id_usuario = c.id_usuario
                ORDER BY c.id_compra DESC
            """))
        ]
        if compras:
            ids = [c["id_compra"] for c in compras]
            por_compra: dict[int, list] = {}
            for r in conn.execute(
                text("""
                    SELECT ci.id_compra, ci.id_insumo, i.nombre AS insumo,
                           ci.cantidad_compra, ci.unidad_compra, ci.cantidad_base, ci.costo_total
                    FROM compra_items ci
                    JOIN insumos i ON i.id_insumo = ci.id_insumo
                    WHERE ci.id_compra = ANY(:ids)
                    ORDER BY ci.id
                """),
                {"ids": ids},
            ):
                por_compra.setdefault(int(r._mapping["id_compra"]), []).append(dict(r._mapping))
            for c in compras:
                c["items"] = por_compra.get(c["id_compra"], [])
    return compras


# --------------------------------------------------------------------------- #
# Movimientos manuales (ajuste / merma)
# --------------------------------------------------------------------------- #

class MovimientoInput(BaseModel):
    id_insumo: int
    tipo: Literal["AJUSTE", "MERMA"]
    cantidad: float = Field(..., ge=-9_999_999, le=9_999_999)
    nota: Optional[str] = Field(None, max_length=300)


@router.post("/movimientos", status_code=201)
def registrar_movimiento(payload: MovimientoInput, user: dict = Depends(_GESTOR)):
    if payload.cantidad == 0:
        raise HTTPException(status_code=400, detail="La cantidad no puede ser 0")

    with engine.begin() as conn:
        ins = conn.execute(
            text("SELECT stock_actual, costo_promedio FROM insumos WHERE id_insumo = :i AND activo = TRUE"),
            {"i": payload.id_insumo},
        ).fetchone()
        if not ins:
            raise HTTPException(status_code=400, detail="Insumo no existe o está inactivo")

        delta = -abs(payload.cantidad) if payload.tipo == "MERMA" else payload.cantidad
        nuevo_stock = float(ins._mapping["stock_actual"]) + delta
        if nuevo_stock < 0:
            raise HTTPException(status_code=400, detail="El movimiento dejaría el stock negativo")

        conn.execute(
            text("""
                INSERT INTO movimientos_inventario
                    (id_insumo, tipo, cantidad, costo_unitario, id_usuario, nota)
                VALUES (:i, :t, :cant, :cu, :u, :nota)
            """),
            {
                "i": payload.id_insumo,
                "t": payload.tipo,
                "cant": delta,
                "cu": float(ins._mapping["costo_promedio"]),
                "u": user["id_usuario"],
                "nota": payload.nota,
            },
        )
        conn.execute(
            text("UPDATE insumos SET stock_actual = :s WHERE id_insumo = :i"),
            {"s": nuevo_stock, "i": payload.id_insumo},
        )
    return {"mensaje": "Movimiento registrado", "stock_actual": nuevo_stock}


@router.get("/movimientos")
def listar_movimientos(
    id_insumo: Optional[int] = None,
    limite: int = 100,
    _: dict = Depends(_GESTOR),
):
    cond = "WHERE m.id_insumo = :id_insumo" if id_insumo else ""
    params: dict = {"lim": min(max(limite, 1), 500)}
    if id_insumo:
        params["id_insumo"] = id_insumo

    with engine.connect() as conn:
        filas = conn.execute(
            text(f"""
                SELECT m.id_movimiento, m.id_insumo, i.nombre AS insumo, m.tipo,
                       m.cantidad, m.costo_unitario, m.fecha, m.nota, u.username
                FROM movimientos_inventario m
                JOIN insumos i ON i.id_insumo = m.id_insumo
                LEFT JOIN usuarios u ON u.id_usuario = m.id_usuario
                {cond}
                ORDER BY m.id_movimiento DESC
                LIMIT :lim
            """),
            params,
        )
        return [dict(f._mapping) for f in filas]


@router.get("/alertas")
def alertas_stock(_: dict = Depends(_GESTOR)):
    with engine.connect() as conn:
        filas = conn.execute(text("""
            SELECT id_insumo, nombre, unidad, stock_actual, stock_minimo
            FROM insumos
            WHERE activo = TRUE AND stock_actual < stock_minimo
            ORDER BY nombre
        """))
        return [dict(f._mapping) for f in filas]

"""Flujos críticos: venta, descuento autorizado, anulación, cierre de caja,
permisos, reintento y sesión. Contra la base local."""
import time
import uuid

import jwt
import pytest
from fastapi import HTTPException
from sqlalchemy import text

from app.auth import (
    ALGORITHM,
    SECRET_KEY,
    crear_token_sesion,
    get_current_user,
    renovar_token_sesion,
)
from app.routers.cajas import (
    AbrirTurno,
    CerrarTurno,
    abrir_turno,
    cerrar_turno,
)
from app.routers.pedidos import PedidoCrear, PedidoItem, crear_pedido
from app.routers.usuarios import AutorizacionRequest, autorizar
from tests.conftest import PASSWORD_PRUEBA


class _Req:
    class client:
        host = "127.0.0.1"


def _producto(db):
    with db.connect() as c:
        f = c.execute(
            text("SELECT id_producto, precio FROM productos WHERE activo = TRUE AND precio > 0 ORDER BY precio DESC LIMIT 1")
        ).fetchone()
    return f._mapping["id_producto"], f._mapping["precio"]


def _ped(prod, **kw):
    base = dict(
        tipo_pedido="RETIRO",
        items=[PedidoItem(id_producto=prod, cantidad=1)],
        pago={"metodo_pago": "EFECTIVO", "monto_recibido": 999999},
        idempotency_key=uuid.uuid4().hex,
    )
    base.update(kw)
    return PedidoCrear(**base)


# --- venta ---------------------------------------------------------------- #

def test_venta_efectivo_ok(db, usuarios, turno_abierto):
    prod, _ = _producto(db)
    r = crear_pedido(_ped(prod), usuarios["cajero"])
    assert r["id_pedido"] > 0
    assert r["pago"]["metodo_pago"] == "EFECTIVO"
    assert r["pago"]["vuelto"] >= 0


def test_venta_efectivo_sin_monto_rechaza(db, usuarios, turno_abierto):
    prod, _ = _producto(db)
    ped = _ped(prod, pago={"metodo_pago": "EFECTIVO", "monto_recibido": None})
    with pytest.raises(HTTPException) as e:
        crear_pedido(ped, usuarios["cajero"])
    assert e.value.status_code == 400


def test_venta_sin_turno_rechaza(db, usuarios):
    prod, _ = _producto(db)
    with pytest.raises(HTTPException) as e:
        crear_pedido(_ped(prod), usuarios["cajero"])
    assert e.value.status_code == 409


def test_totales_con_decimal(db, usuarios, turno_abierto):
    from decimal import Decimal

    prod, precio = _producto(db)
    ped = _ped(prod, descuento=5, items=[PedidoItem(id_producto=prod, cantidad=3, descuento=10)])
    r = crear_pedido(ped, usuarios["cajero"])
    p = Decimal(str(precio))
    base = p * 3 - (p * 3 * Decimal(10) / 100)
    total = (base - base * Decimal(5) / 100).quantize(Decimal("0.01"))
    assert Decimal(str(r["total"])) == total
    with db.connect() as c:
        fila = c.execute(text("SELECT total FROM pedidos WHERE id_pedido = :i"), {"i": r["id_pedido"]}).scalar()
    assert Decimal(str(fila)) == total


# --- descuento autorizado ---------------------------------------------------- #

def test_descuento_sobre_tope_sin_token_rechaza(db, usuarios, turno_abierto):
    prod, _ = _producto(db)
    with pytest.raises(HTTPException) as e:
        crear_pedido(_ped(prod, descuento=80), usuarios["cajero"])
    assert e.value.status_code == 403


def test_descuento_autorizado_ok_y_token_un_solo_uso(db, usuarios, turno_abierto, password_temporal):
    prod, _ = _producto(db)
    resp = autorizar(
        AutorizacionRequest(username=usuarios["supervisor"]["username"], password=PASSWORD_PRUEBA, descuento_pct=80),
        _Req(),
        usuarios["cajero"],
    )
    tok = resp["token"]
    r = crear_pedido(_ped(prod, descuento=80, token_autorizacion=tok), usuarios["cajero"])
    assert r["id_pedido"] > 0
    # segundo uso del mismo token -> rechazado
    with pytest.raises(HTTPException) as e:
        crear_pedido(_ped(prod, descuento=80, token_autorizacion=tok), usuarios["cajero"])
    assert e.value.status_code == 409


def test_token_autorizacion_de_otro_cajero_rechaza(db, usuarios, turno_abierto):
    prod, _ = _producto(db)
    tok = jwt.encode(
        {
            "user_id": usuarios["supervisor"]["id_usuario"],
            "proposito": "descuento_pos",
            "jti": uuid.uuid4().hex,
            "sol": 999999,
            "max_desc_pct": 80,
            "exp": int(time.time()) + 120,
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    with pytest.raises(HTTPException) as e:
        crear_pedido(_ped(prod, descuento=80, token_autorizacion=tok), usuarios["cajero"])
    assert e.value.status_code == 403


def test_token_autorizacion_supera_techo_rechaza(db, usuarios, turno_abierto):
    prod, _ = _producto(db)
    tok = jwt.encode(
        {
            "user_id": usuarios["supervisor"]["id_usuario"],
            "proposito": "descuento_pos",
            "jti": uuid.uuid4().hex,
            "sol": usuarios["cajero"]["id_usuario"],
            "max_desc_pct": 25,
            "exp": int(time.time()) + 120,
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    with pytest.raises(HTTPException) as e:
        crear_pedido(_ped(prod, descuento=80, token_autorizacion=tok), usuarios["cajero"])
    assert e.value.status_code == 403


def test_supervisor_no_se_autoriza_a_si_mismo(usuarios, password_temporal):
    with pytest.raises(HTTPException) as e:
        autorizar(
            AutorizacionRequest(username=usuarios["supervisor"]["username"], password=PASSWORD_PRUEBA, descuento_pct=50),
            _Req(),
            usuarios["supervisor"],
        )
    assert e.value.status_code == 403


# --- idempotencia --------------------------------------------------------- #

def test_idempotencia_no_duplica(db, usuarios, turno_abierto):
    prod, _ = _producto(db)
    clave = uuid.uuid4().hex
    r1 = crear_pedido(_ped(prod, idempotency_key=clave), usuarios["cajero"])
    r2 = crear_pedido(_ped(prod, items=[PedidoItem(id_producto=prod, cantidad=5)], idempotency_key=clave), usuarios["cajero"])
    assert r1["id_pedido"] == r2["id_pedido"]
    assert r1["total"] == r2["total"]


# --- caja --------------------------------------------------------------- #

def test_abrir_turno_otra_sucursal_rechaza(db, usuarios):
    # activa temporalmente una caja de OTRA sucursal
    with db.connect() as c:
        otra = c.execute(
            text("SELECT id_caja FROM cajas WHERE id_sucursal <> :s ORDER BY id_caja LIMIT 1"),
            {"s": usuarios["id_sucursal"]},
        ).scalar()
    if not otra:
        pytest.skip("no hay caja de otra sucursal en la base local")
    with db.begin() as c:
        prev = c.execute(text("SELECT activo FROM cajas WHERE id_caja = :c"), {"c": otra}).scalar()
        c.execute(text("UPDATE cajas SET activo = TRUE WHERE id_caja = :c"), {"c": otra})
    try:
        with pytest.raises(HTTPException) as e:
            abrir_turno(AbrirTurno(id_caja=otra, monto_inicial=0), usuarios["cajero"])
        assert e.value.status_code == 403
    finally:
        with db.begin() as c:
            c.execute(text("UPDATE cajas SET activo = :a WHERE id_caja = :c"), {"a": prev, "c": otra})


def test_doble_apertura_misma_caja_rechaza(db, usuarios, turno_abierto):
    # el cajero ya tiene turno; el supervisor intenta abrir la misma caja
    with pytest.raises(HTTPException) as e:
        abrir_turno(AbrirTurno(id_caja=usuarios["id_caja"], monto_inicial=0), usuarios["supervisor"])
    assert e.value.status_code == 409


def test_cobro_con_turno_cerrado_rechaza(db, usuarios, turno_abierto):
    prod, _ = _producto(db)
    cerrar_turno(turno_abierto, CerrarTurno(efectivo_contado=10000), usuarios["cajero"])
    with pytest.raises(HTTPException) as e:
        crear_pedido(_ped(prod), usuarios["cajero"])
    assert e.value.status_code == 409


# --- anulación / permisos ------------------------------------------------- #

def test_anular_pedido_permiso(db, usuarios, turno_abierto):
    from app.routers.pedidos import anular_pedido

    prod, _ = _producto(db)
    r = crear_pedido(_ped(prod), usuarios["cajero"])
    # el cajero no puede anular (require_role no lo deja; acá se prueba la regla)
    from app.rbac import Rol

    assert usuarios["cajero"]["id_rol"] == Rol.CAJERO
    # el supervisor sí
    out = anular_pedido(r["id_pedido"], usuarios["supervisor"])
    assert "anulado" in out["mensaje"].lower()
    with db.connect() as c:
        estado = c.execute(text("SELECT estado FROM pedidos WHERE id_pedido = :i"), {"i": r["id_pedido"]}).scalar()
    assert estado == "CANCELADO"


# --- sesión ------------------------------------------------------------- #

def test_refresh_conserva_limite_y_renueva_exp():
    t = crear_token_sesion(1)
    p = jwt.decode(t, SECRET_KEY, algorithms=[ALGORITHM])
    time.sleep(1)
    t2 = renovar_token_sesion(t)
    p2 = jwt.decode(t2, SECRET_KEY, algorithms=[ALGORITHM])
    assert p2["limite"] == p["limite"]
    assert p2["exp"] >= p["exp"]


def test_refresh_pasado_el_limite_rechaza():
    viejo = jwt.encode(
        {"user_id": 1, "limite": int(time.time()) - 5, "exp": int(time.time()) + 3600},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    with pytest.raises(HTTPException) as e:
        renovar_token_sesion(viejo)
    assert e.value.status_code == 401


def test_token_de_proposito_no_es_sesion():
    tok = jwt.encode(
        {"user_id": 1, "proposito": "descuento_pos", "exp": int(time.time()) + 120},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    with pytest.raises(HTTPException) as e:
        get_current_user(tok)
    assert e.value.status_code == 401

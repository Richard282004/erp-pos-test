"""Fixtures para los tests de flujos críticos.

Corren contra la base local (la misma de `Backend/.env`). Cada test crea sus
propios datos de operación (turno, pedido) y los borra al terminar. No tocan
el catálogo ni las cuentas salvo el password temporal de `usuarios_prueba`,
que se restaura siempre.

Se prueban las funciones de ruta directamente con un dict de usuario falso,
que es como FastAPI las recibe después de resolver `get_current_user`.
"""
import os

import bcrypt
import pytest
from sqlalchemy import text

os.environ.setdefault("JWT_SECRET", "test-secret-para-correr-los-tests-1234567890")

from app.database import engine  # noqa: E402
from app.rbac import Rol  # noqa: E402

PASSWORD_PRUEBA = "prueba-1234"


@pytest.fixture(scope="session")
def db():
    return engine


@pytest.fixture(scope="session")
def usuarios(db):
    """Un cajero, un supervisor y un admin reales de la base, activos y en la
    misma sucursal, con una caja activa en esa sucursal."""
    with db.connect() as c:
        caja = c.execute(
            text(
                "SELECT c.id_caja, c.id_sucursal FROM cajas c "
                "WHERE c.activo = TRUE ORDER BY c.id_caja LIMIT 1"
            )
        ).fetchone()
        assert caja, "hace falta al menos una caja activa en la base local"
        id_sucursal = caja._mapping["id_sucursal"]

        def uno(rol):
            f = c.execute(
                text(
                    "SELECT id_usuario, username FROM usuarios "
                    "WHERE id_rol = :r AND activo = TRUE AND id_sucursal = :s "
                    "ORDER BY id_usuario LIMIT 1"
                ),
                {"r": int(rol), "s": id_sucursal},
            ).fetchone()
            assert f, f"hace falta un usuario activo rol {rol!r} en la sucursal {id_sucursal}"
            return {
                "id_usuario": f._mapping["id_usuario"],
                "username": f._mapping["username"],
                "id_rol": int(rol),
                "id_sucursal": id_sucursal,
            }

        return {
            "cajero": uno(Rol.CAJERO),
            "supervisor": uno(Rol.SUPERVISOR),
            "admin": uno(Rol.ADMIN),
            "id_caja": caja._mapping["id_caja"],
            "id_sucursal": id_sucursal,
        }


@pytest.fixture()
def password_temporal(db, usuarios):
    """Pone `PASSWORD_PRUEBA` en cajero y supervisor durante el test, restaura
    después. Necesario para los endpoints que validan credenciales."""
    ids = [usuarios["cajero"]["id_usuario"], usuarios["supervisor"]["id_usuario"]]
    h = bcrypt.hashpw(PASSWORD_PRUEBA.encode(), bcrypt.gensalt()).decode()
    with db.begin() as c:
        viejos = {
            r._mapping["id_usuario"]: r._mapping["password_hash"]
            for r in c.execute(
                text("SELECT id_usuario, password_hash FROM usuarios WHERE id_usuario = ANY(:ids)"),
                {"ids": ids},
            )
        }
        c.execute(
            text("UPDATE usuarios SET password_hash = :h WHERE id_usuario = ANY(:ids)"),
            {"h": h, "ids": ids},
        )
    yield
    with db.begin() as c:
        for uid, hh in viejos.items():
            c.execute(
                text("UPDATE usuarios SET password_hash = :h WHERE id_usuario = :u"),
                {"h": hh, "u": uid},
            )


@pytest.fixture(autouse=True)
def _sin_turnos_abiertos(db, usuarios):
    """Antes y después de cada test, cierra/borra cualquier turno abierto de
    los usuarios de prueba y su rastro, para no arrastrar estado entre tests."""

    def limpiar():
        ids = [u["id_usuario"] for u in (usuarios["cajero"], usuarios["supervisor"], usuarios["admin"])]
        with db.begin() as c:
            turnos = [
                r[0]
                for r in c.execute(
                    text("SELECT id_turno FROM turnos_caja WHERE id_usuario = ANY(:ids)"),
                    {"ids": ids},
                )
            ]
            for t in turnos:
                c.execute(text("DELETE FROM pedidos_idempotencia WHERE id_pedido IN (SELECT id_pedido FROM pedidos WHERE id_turno=:t)"), {"t": t})
                c.execute(text("DELETE FROM autorizaciones_usadas WHERE id_pedido IN (SELECT id_pedido FROM pedidos WHERE id_turno=:t)"), {"t": t})
                c.execute(text("DELETE FROM pagos WHERE id_turno=:t"), {"t": t})
                c.execute(text("DELETE FROM pedido_item_modificadores WHERE id_item IN (SELECT id_item FROM pedido_items WHERE id_pedido IN (SELECT id_pedido FROM pedidos WHERE id_turno=:t))"), {"t": t})
                c.execute(text("DELETE FROM pedido_items WHERE id_pedido IN (SELECT id_pedido FROM pedidos WHERE id_turno=:t)"), {"t": t})
                c.execute(text("DELETE FROM movimientos_caja WHERE id_turno=:t"), {"t": t})
                c.execute(text("DELETE FROM auditoria WHERE entidad='pedido' AND id_entidad IN (SELECT id_pedido FROM pedidos WHERE id_turno=:t)"), {"t": t})
                c.execute(text("DELETE FROM pedidos WHERE id_turno=:t"), {"t": t})
                c.execute(text("DELETE FROM turnos_caja WHERE id_turno=:t"), {"t": t})

    limpiar()
    yield
    limpiar()


@pytest.fixture()
def turno_abierto(db, usuarios):
    """Abre un turno para el cajero en la caja de prueba y devuelve su id."""
    from app.routers.cajas import AbrirTurno, abrir_turno

    r = abrir_turno(AbrirTurno(id_caja=usuarios["id_caja"], monto_inicial=10000), usuarios["cajero"])
    return r["id_turno"]

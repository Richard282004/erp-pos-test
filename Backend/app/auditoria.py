"""Registro de quién anuló un pedido o borró algo definitivamente.

Desactivar ya deja rastro (el estado activo pasa a false, se puede reactivar).
Anular y borrar-definitivo no: uno cancela una venta de dinero real, el otro
no tiene vuelta atrás. Por eso quedan acá, aparte de cualquier otro cambio de
rutina.
"""
from sqlalchemy import text


def registrar(conn, user: dict, accion: str, entidad: str, id_entidad, detalle: str | None = None) -> None:
    conn.execute(
        text("""
            INSERT INTO auditoria (id_usuario, username, accion, entidad, id_entidad, detalle)
            VALUES (:id_usuario, :username, :accion, :entidad, :id_entidad, :detalle)
        """),
        {
            "id_usuario": user.get("id_usuario"),
            "username": user.get("username") or "?",
            "accion": accion,
            "entidad": entidad,
            "id_entidad": id_entidad,
            "detalle": detalle,
        },
    )

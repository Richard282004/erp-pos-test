"""Datos mínimos para arrancar una base limpia + un usuario admin.

Uso (desde la raíz del repo, con DATABASE_URL en el entorno):
    python Backend/scripts/seed_inicial.py --username admin --password "TuClaveLarga" --nombre Nombre --apellido Apellido

Es idempotente: se puede correr varias veces. Si el usuario ya existe, solo
le actualiza la contraseña.
"""
import argparse
import os
import sys

import bcrypt
from sqlalchemy import text

# Permitir importar `app.*` sin importar desde qué carpeta se ejecute.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.database import engine  # noqa: E402


CATEGORIAS = ["Hamburguesas", "Combos", "Acompañamientos", "Bebidas", "Postres"]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--username", required=True)
    ap.add_argument("--password", required=True)
    ap.add_argument("--nombre", default="Admin")
    ap.add_argument("--apellido", default="Byeburger")
    ap.add_argument("--empresa", default="Byeburger")
    ap.add_argument("--sucursal", default="Casa Matriz")
    args = ap.parse_args()

    if len(args.password) < 8:
        ap.error("la contraseña debe tener al menos 8 caracteres")

    pw_hash = bcrypt.hashpw(args.password.encode(), bcrypt.gensalt()).decode()

    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO empresas (id_empresa, nombre, activo)
            VALUES (1, :n, TRUE)
            ON CONFLICT (id_empresa) DO NOTHING
        """), {"n": args.empresa})

        for i, (nombre, desc) in enumerate(
            [("ADMINISTRADOR", "Acceso total"), ("SUPERVISOR", "Gestión de catálogo y venta"),
             ("CAJERO", "Operación de venta")], start=1
        ):
            conn.execute(text("""
                INSERT INTO roles (id_rol, nombre, descripcion, activo)
                VALUES (:i, :n, :d, TRUE)
                ON CONFLICT (id_rol) DO NOTHING
            """), {"i": i, "n": nombre, "d": desc})

        for nombre in CATEGORIAS:
            conn.execute(text("""
                INSERT INTO categorias (id_empresa, nombre, activo)
                SELECT 1, :n, TRUE
                WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE nombre = :n)
            """), {"n": nombre})

        suc = conn.execute(text("SELECT id_sucursal FROM sucursales ORDER BY id_sucursal LIMIT 1")).scalar()
        if suc is None:
            suc = conn.execute(text("""
                INSERT INTO sucursales (id_empresa, nombre, activo)
                VALUES (1, :n, TRUE) RETURNING id_sucursal
            """), {"n": args.sucursal}).scalar()

        caja = conn.execute(text("SELECT 1 FROM cajas WHERE id_sucursal = :s AND activo = TRUE"), {"s": suc}).scalar()
        if not caja:
            conn.execute(text("""
                INSERT INTO cajas (id_sucursal, nombre, activo) VALUES (:s, 'Caja 1', TRUE)
            """), {"s": suc})

        existe = conn.execute(
            text("SELECT id_usuario FROM usuarios WHERE username = :u"), {"u": args.username}
        ).scalar()
        if existe:
            conn.execute(text("""
                UPDATE usuarios SET password_hash = :p, activo = TRUE, id_rol = 1 WHERE username = :u
            """), {"p": pw_hash, "u": args.username})
            print(f"Usuario '{args.username}' ya existía → contraseña actualizada, rol admin.")
        else:
            conn.execute(text("""
                INSERT INTO usuarios (id_sucursal, id_rol, nombre, apellido, username, password_hash, activo)
                VALUES (:s, 1, :n, :a, :u, :p, TRUE)
            """), {"s": suc, "n": args.nombre, "a": args.apellido, "u": args.username, "p": pw_hash})
            print(f"Usuario admin '{args.username}' creado en sucursal {suc}.")

    print("Seed OK.")


if __name__ == "__main__":
    main()

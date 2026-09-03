#!/usr/bin/env python3
"""Genera un hash bcrypt para una contraseña y actualiza el campo password_hash
   de la tabla usuarios para el username indicado.

   Uso:
     python3 Backend/scripts/set_user_password.py <username> <new_password>

"""
import sys
import bcrypt
from app.database import engine
from sqlalchemy import text


def main():
    if len(sys.argv) < 3:
        sys.exit("Uso: python Backend/scripts/set_user_password.py <username> <password>")
    username, new_password = sys.argv[1], sys.argv[2]
    if len(new_password) < 8:
        sys.exit("La contraseña debe tener al menos 8 caracteres")

    # bcrypt.hashpw returns bytes; decode to store as text
    hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    print(f"Updating password for {username}...")
    with engine.begin() as conn:
        res = conn.execute(
            text("UPDATE usuarios SET password_hash = :h WHERE username = :u"),
            {"h": hashed, "u": username},
        )

    print("Done. Rows affected:", getattr(res, 'rowcount', 'unknown'))

if __name__ == '__main__':
    main()

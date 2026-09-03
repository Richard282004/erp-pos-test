import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import text
from app.database import engine

# La clave de firma JWT es obligatoria y debe ser aleatoria. Sin ella, cualquiera
# podría falsificar un token. Generá una con:  python -c "import secrets;print(secrets.token_urlsafe(48))"
SECRET_KEY = os.getenv("JWT_SECRET")
if not SECRET_KEY or len(SECRET_KEY) < 32:
    raise RuntimeError(
        "JWT_SECRET no está configurada o es demasiado corta (>= 32 chars). "
        "Definí Backend/.env con un valor aleatorio largo."
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_MIN", "15"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/usuarios/login")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    to_encode["exp"] = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sesión expirada")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    payload = decode_token(token)
    user_id = payload.get("user_id")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Token inválido")

    with engine.connect() as conn:
        fila = conn.execute(
            text(
                "SELECT id_usuario, id_sucursal, id_rol, nombre, apellido, username, activo "
                "FROM usuarios WHERE id_usuario = :id"
            ),
            {"id": user_id},
        ).fetchone()

    if not fila:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    user = dict(fila._mapping)
    if not user.get("activo"):
        raise HTTPException(status_code=403, detail="Usuario desactivado")
    return user

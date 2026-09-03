from enum import IntEnum

from fastapi import Depends, HTTPException, status

from app.auth import get_current_user


class Rol(IntEnum):
    ADMIN = 1
    SUPERVISOR = 2
    CAJERO = 3


def require_role(*roles_permitidos: Rol):
    """Dependency factory: exige que el usuario autenticado tenga uno de los roles dados.

    Uso: user: dict = Depends(require_role(Rol.ADMIN, Rol.SUPERVISOR))
    """

    def dependency(user: dict = Depends(get_current_user)) -> dict:
        if user.get("id_rol") not in roles_permitidos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: insufficient role",
            )
        return user

    return dependency

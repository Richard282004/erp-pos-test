from fastapi import APIRouter, Depends
from sqlalchemy import text

from app.database import engine
from app.rbac import Rol, require_role

router = APIRouter(prefix="/auditoria", tags=["Auditoría"])


@router.get("/")
def listar(limite: int = 200, _: dict = Depends(require_role(Rol.ADMIN))):
    with engine.connect() as conn:
        filas = conn.execute(
            text("""
                SELECT id_auditoria, id_usuario, username, accion, entidad, id_entidad, detalle, fecha
                FROM auditoria
                ORDER BY fecha DESC
                LIMIT :lim
            """),
            {"lim": min(max(limite, 1), 1000)},
        )
        return [dict(f._mapping) for f in filas]

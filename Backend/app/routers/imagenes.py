from fastapi import APIRouter, Depends, File, UploadFile

from app.rbac import Rol, require_role
from app.storage import MAX_BYTES, storage_configurado, subir_imagen

router = APIRouter(prefix="/imagenes", tags=["Imágenes"])

_GESTOR = require_role(Rol.ADMIN, Rol.SUPERVISOR)


@router.get("/estado")
def estado(_: dict = Depends(_GESTOR)):
    """Permite al frontend mostrar u ocultar el botón de subir foto."""
    return {"disponible": storage_configurado(), "max_bytes": MAX_BYTES}


@router.post("/productos", status_code=201)
async def subir_imagen_producto(
    archivo: UploadFile = File(...),
    _: dict = Depends(_GESTOR),
):
    contenido = await archivo.read()
    return {"imagen_url": subir_imagen(contenido, "productos")}

"""Subida de imágenes a Supabase Storage.

La clave de servicio vive solo acá (variable de entorno en Render): el navegador
nunca la ve. El frontend manda el archivo a la API y la API lo sube.
"""
import os
import uuid
from urllib import error, request

from fastapi import HTTPException

BUCKET = os.getenv("SUPABASE_BUCKET", "productos")
_URL = (os.getenv("SUPABASE_URL") or "").rstrip("/")
_KEY = os.getenv("SUPABASE_SERVICE_KEY") or ""

MAX_BYTES = 3 * 1024 * 1024  # 3 MB; el frontend ya redimensiona antes de enviar

# Se valida por los bytes iniciales, no por el content-type que declara el cliente.
_FIRMAS = (
    (b"\xff\xd8\xff", "image/jpeg", "jpg"),
    (b"\x89PNG\r\n\x1a\n", "image/png", "png"),
    (b"GIF87a", "image/gif", "gif"),
    (b"GIF89a", "image/gif", "gif"),
)


def storage_configurado() -> bool:
    return bool(_URL and _KEY)


def _tipo_real(contenido: bytes) -> tuple[str, str]:
    """Devuelve (mime, extensión) mirando los bytes. 400 si no es una imagen soportada."""
    for firma, mime, ext in _FIRMAS:
        if contenido.startswith(firma):
            return mime, ext
    # WebP: "RIFF" + 4 bytes de tamaño + "WEBP"
    if contenido[:4] == b"RIFF" and contenido[8:12] == b"WEBP":
        return "image/webp", "webp"
    raise HTTPException(
        status_code=400,
        detail="El archivo no es una imagen válida (se aceptan JPG, PNG, WebP o GIF)",
    )


def subir_imagen(contenido: bytes, carpeta: str = "productos") -> str:
    """Sube los bytes al bucket y devuelve la URL pública."""
    if not storage_configurado():
        raise HTTPException(
            status_code=503,
            detail=(
                "Falta configurar el almacenamiento de imágenes: definí "
                "SUPABASE_URL y SUPABASE_SERVICE_KEY en el servidor."
            ),
        )
    if not contenido:
        raise HTTPException(status_code=400, detail="El archivo está vacío")
    if len(contenido) > MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"La imagen supera el máximo de {MAX_BYTES // (1024 * 1024)} MB",
        )

    mime, ext = _tipo_real(contenido)
    ruta = f"{carpeta}/{uuid.uuid4().hex}.{ext}"

    peticion = request.Request(
        f"{_URL}/storage/v1/object/{BUCKET}/{ruta}",
        data=contenido,
        method="POST",
        headers={
            "Authorization": f"Bearer {_KEY}",
            "apikey": _KEY,
            "Content-Type": mime,
            "Cache-Control": "public, max-age=31536000",
        },
    )

    try:
        with request.urlopen(peticion, timeout=30) as respuesta:
            respuesta.read()
    except error.HTTPError as e:
        detalle = e.read().decode("utf-8", "replace")[:300]
        if e.code == 404:
            detalle = f"No existe el bucket '{BUCKET}' en Supabase Storage. {detalle}"
        raise HTTPException(status_code=502, detail=f"Supabase Storage: {detalle}") from e
    except error.URLError as e:
        raise HTTPException(
            status_code=502, detail=f"No se pudo contactar Supabase Storage: {e.reason}"
        ) from e

    return f"{_URL}/storage/v1/object/public/{BUCKET}/{ruta}"

"""Configuración de facturación electrónica (DTE).

SOLO configuración. La emisión real (armar el documento, timbre PDF417, envío
al SII, RCOF, notas de crédito) todavía no está implementada. Mientras `activado`
sea FALSE el POS emite comprobantes internos como hasta ahora.
"""
import urllib.error
import urllib.request
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import text

from app.database import engine
from app.rbac import Rol, require_role

router = APIRouter(prefix="/dte", tags=["Facturación electrónica"])

_ADMIN = require_role(Rol.ADMIN)

PROVEEDORES = ("OPENFACTURA", "LIBREDTE", "BSALE")
AMBIENTES = ("certificacion", "produccion")
TIPOS_DOC = (33, 39)  # 33 factura electrónica, 39 boleta electrónica

_COLS = (
    "activado, proveedor, ambiente, api_url, api_token, rut_emisor, razon_social, "
    "giro, codigo_actividad, direccion_casa_matriz, comuna_casa_matriz, "
    "tipo_documento_default, resolucion_numero, resolucion_fecha, fecha_actualizacion"
)

# Campos obligatorios para poder activar la emisión.
_REQUERIDOS_PARA_ACTIVAR = (
    ("proveedor", "el proveedor"),
    ("api_url", "la URL de la API"),
    ("rut_emisor", "el RUT del emisor"),
    ("resolucion_numero", "el número de resolución del SII"),
    ("resolucion_fecha", "la fecha de resolución del SII"),
)


class ConfigDTEInput(BaseModel):
    activado: bool = False
    proveedor: Optional[str] = Field(None, max_length=30)
    ambiente: str = Field("certificacion", max_length=20)
    api_url: Optional[str] = Field(None, max_length=300)
    # Si viene None o "" no se toca el token guardado; si viene con valor, se reemplaza.
    api_token: Optional[str] = Field(None, max_length=400)
    rut_emisor: Optional[str] = Field(None, max_length=20)
    razon_social: Optional[str] = Field(None, max_length=200)
    giro: Optional[str] = Field(None, max_length=200)
    codigo_actividad: Optional[str] = Field(None, max_length=20)
    direccion_casa_matriz: Optional[str] = Field(None, max_length=200)
    comuna_casa_matriz: Optional[str] = Field(None, max_length=100)
    tipo_documento_default: int = 39
    resolucion_numero: Optional[str] = Field(None, max_length=20)
    resolucion_fecha: Optional[date] = None

    @field_validator("proveedor")
    @classmethod
    def _prov(cls, v):
        if v and v not in PROVEEDORES:
            raise ValueError(f"Proveedor inválido. Opciones: {', '.join(PROVEEDORES)}")
        return v

    @field_validator("ambiente")
    @classmethod
    def _amb(cls, v):
        if v not in AMBIENTES:
            raise ValueError("El ambiente debe ser 'certificacion' o 'produccion'")
        return v

    @field_validator("tipo_documento_default")
    @classmethod
    def _tipo(cls, v):
        if v not in TIPOS_DOC:
            raise ValueError("El documento por defecto debe ser 33 (factura) o 39 (boleta)")
        return v

    @field_validator("rut_emisor")
    @classmethod
    def _rut(cls, v):
        if not v:
            return v
        limpio = v.replace(".", "").replace(" ", "").upper()
        cuerpo, _, dv = limpio.partition("-")
        if not dv or not cuerpo.isdigit() or len(cuerpo) < 7 or dv not in "0123456789K":
            raise ValueError("RUT inválido. Formato: 76543210-K")
        return limpio

    @field_validator("api_url")
    @classmethod
    def _url(cls, v):
        if v and not v.startswith(("http://", "https://")):
            raise ValueError("La URL debe empezar con http:// o https://")
        return v


def _enmascarar(token: Optional[str]) -> Optional[str]:
    if not token:
        return None
    return "••••" + token[-4:] if len(token) > 4 else "••••"


def _leer(conn) -> dict:
    fila = conn.execute(
        text(f"SELECT {_COLS} FROM config_dte WHERE id_config = 1")
    ).mappings().first()
    if not fila:
        # La migración inserta la fila; si falta, se devuelven los defaults.
        return {
            "activado": False,
            "proveedor": None,
            "ambiente": "certificacion",
            "api_url": None,
            "api_token": None,
            "rut_emisor": None,
            "razon_social": None,
            "giro": None,
            "codigo_actividad": None,
            "direccion_casa_matriz": None,
            "comuna_casa_matriz": None,
            "tipo_documento_default": 39,
            "resolucion_numero": None,
            "resolucion_fecha": None,
            "fecha_actualizacion": None,
        }
    return dict(fila)


def _salida(cfg: dict) -> dict:
    out = dict(cfg)
    token = out.pop("api_token", None)
    out["api_token"] = _enmascarar(token)
    out["api_token_configurado"] = bool(token)
    return out


@router.get("/config")
def obtener_config(_: dict = Depends(_ADMIN)):
    """Configuración actual. El token de API se devuelve enmascarado."""
    with engine.connect() as conn:
        return _salida(_leer(conn))


@router.put("/config")
def guardar_config(payload: ConfigDTEInput, _: dict = Depends(_ADMIN)):
    with engine.begin() as conn:
        actual = _leer(conn)

        # El token solo se reemplaza si viene con valor; si no, se conserva.
        nuevo_token = payload.api_token.strip() if payload.api_token else None
        token_final = nuevo_token if nuevo_token else actual.get("api_token")

        datos = payload.model_dump()
        datos["api_token"] = token_final

        # No se puede activar la emisión a medias.
        if datos["activado"]:
            faltan = [
                etiqueta
                for campo, etiqueta in _REQUERIDOS_PARA_ACTIVAR
                if not datos.get(campo)
            ]
            if not token_final:
                faltan.append("el token de API")
            if faltan:
                raise HTTPException(
                    status_code=400,
                    detail="Para activar la facturación falta: " + ", ".join(faltan),
                )

        conn.execute(
            text("""
                UPDATE config_dte SET
                    activado = :activado,
                    proveedor = :proveedor,
                    ambiente = :ambiente,
                    api_url = :api_url,
                    api_token = :api_token,
                    rut_emisor = :rut_emisor,
                    razon_social = :razon_social,
                    giro = :giro,
                    codigo_actividad = :codigo_actividad,
                    direccion_casa_matriz = :direccion_casa_matriz,
                    comuna_casa_matriz = :comuna_casa_matriz,
                    tipo_documento_default = :tipo_documento_default,
                    resolucion_numero = :resolucion_numero,
                    resolucion_fecha = :resolucion_fecha,
                    fecha_actualizacion = CURRENT_TIMESTAMP
                WHERE id_config = 1
            """),
            datos,
        )
        return _salida(_leer(conn))


@router.post("/config/probar")
def probar_conexion(_: dict = Depends(_ADMIN)):
    """Chequeo básico: que la URL de la API responda. NO valida credenciales
    ni que el proveedor esté bien configurado — eso recién se sabe al emitir."""
    with engine.connect() as conn:
        cfg = _leer(conn)

    url = cfg.get("api_url")
    if not url:
        raise HTTPException(status_code=400, detail="Primero configurá la URL de la API")

    req = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=6) as resp:
            codigo = resp.status
    except urllib.error.HTTPError as e:
        codigo = e.code  # respondió, aunque sea 401/404
    except Exception as e:  # noqa: BLE001
        return {"ok": False, "detalle": f"No se pudo conectar: {type(e).__name__}"}

    return {
        "ok": codigo < 500,
        "detalle": f"El servidor respondió (HTTP {codigo}). No se validaron credenciales.",
    }

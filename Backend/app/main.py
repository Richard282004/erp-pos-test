import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    auditoria,
    cajas,
    categorias,
    empresa,
    estadisticas,
    imagenes,
    insumos,
    inventario,
    mantenimiento,
    modificadores,
    pedidos,
    productos,
    sucursales,
    usuarios,
)

# La doc interactiva (/docs, /redoc, /openapi.json) expone el mapa completo de
# la API. Útil en desarrollo, innecesaria en producción: se activa con API_DOCS=1.
_DOCS = os.getenv("API_DOCS") == "1"
app = FastAPI(
    title="Byeburger API",
    version="1.0.0",
    docs_url="/docs" if _DOCS else None,
    redoc_url="/redoc" if _DOCS else None,
    openapi_url="/openapi.json" if _DOCS else None,
)

# Orígenes permitidos para el frontend. Configurable por env (CSV).
_DEFAULT_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
origins = [o.strip() for o in os.getenv("CORS_ORIGINS", _DEFAULT_ORIGINS).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def cabeceras_seguridad(request: Request, call_next):
    """Cabeceras defensivas. Es una API JSON: no rinde imágenes ni HTML, así
    que el riesgo de XSS/clickjacking es bajo, pero estas cabeceras son
    gratis y evitan que un intermediario cachee respuestas con datos o que
    un navegador intente adivinar el tipo de contenido.
    """
    respuesta = await call_next(request)
    respuesta.headers["X-Content-Type-Options"] = "nosniff"
    respuesta.headers["X-Frame-Options"] = "DENY"
    respuesta.headers["Referrer-Policy"] = "no-referrer"
    respuesta.headers["Cache-Control"] = "no-store"
    respuesta.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    return respuesta

app.include_router(auditoria.router)
app.include_router(cajas.router)
app.include_router(categorias.router)
app.include_router(empresa.router)
app.include_router(estadisticas.router)
app.include_router(imagenes.router)
app.include_router(insumos.router)
app.include_router(inventario.router)
app.include_router(mantenimiento.router)
app.include_router(modificadores.router)
app.include_router(pedidos.router)
app.include_router(productos.router)
app.include_router(sucursales.router)
app.include_router(usuarios.router)


@app.get("/")
def inicio():
    return {"servicio": "Byeburger API", "estado": "ok"}

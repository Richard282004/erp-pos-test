import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    cajas,
    categorias,
    estadisticas,
    insumos,
    inventario,
    modificadores,
    pedidos,
    productos,
    sucursales,
    usuarios,
)

app = FastAPI(title="Byeburger API", version="1.0.0")

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

app.include_router(cajas.router)
app.include_router(categorias.router)
app.include_router(estadisticas.router)
app.include_router(insumos.router)
app.include_router(inventario.router)
app.include_router(modificadores.router)
app.include_router(pedidos.router)
app.include_router(productos.router)
app.include_router(sucursales.router)
app.include_router(usuarios.router)


@app.get("/")
def inicio():
    return {"servicio": "Byeburger API", "estado": "ok"}

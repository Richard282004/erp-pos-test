# Bitácora del proyecto Byeburger

Fecha de corte: 2026-08-18

Resumen general:

- Proyecto: Byeburger (Backend: FastAPI + SQLAlchemy, Frontend: React + TypeScript + Vite)
- Objetivo: crear un POS minimal con catálogos, carrito, persistencia de pedidos y autenticación JWT.

Cambios realizados (cronológico, resumido):

1. Frontend — correcciones y mejoras UI
  - Archivo: `Frontend/src/App.tsx`
    - Corregí error en la referencia de imagen (`imagen` -> `imagen_url`) y añadí `ImageWithFallback` con placeholder SVG para evitar src nulos.
    - Añadí estados para `loadingProductos`, `errorProductos` y función `cargarProductos()` con reintento.
    - Implementé el flujo de `cobrarPedido()` que construye el payload (items, totales, observación) y lo envía al backend `/pedidos/`.
    - Añadí componentes/estados para autenticación: formulario de login, `accessToken` en memoria, envío de `Authorization` en peticiones al backend, y manejo básico de mensajes de pedido.

2. Backend — persistencia de pedidos y preparación de auth
  - Archivo: `Backend/app/routers/pedidos.py`
    - Endpoint `POST /pedidos/` ahora acepta items y persiste en `pedidos` y `pedido_items` en una transacción.
    - Preparé la firma para aceptar usuario autenticado (se actualizó la firma para usar `user` cuando esté disponible).

  - Archivo: `Backend/app/auth.py` (nuevo)
    - Helpers JWT: `create_access_token`, `create_refresh_token`, `decode_token` y `get_current_user` (dependencia que valida token y carga usuario desde DB).
    - Usa `PyJWT` y consulta `JWT_SECRET` desde variables de entorno.

  - Archivo: `Backend/app/routers/usuarios.py`
    - Añadí `/usuarios/login` que valida credenciales contra `usuarios.password_hash`, crea `access_token` y `refresh` cookie (HttpOnly), y `/usuarios/me` para obtener el perfil del usuario vía `get_current_user`.

3. Scripts y utilidades
  - Archivo: `Backend/scripts/set_user_password.py`
    - Script para generar hash bcrypt y actualizar `password_hash` de un usuario (útil para restaurar contraseña). Ejecutado para `richard`->`temporal`.

4. Configuración y operaciones ejecutadas
  - Añadí `CORSMiddleware` en `Backend/app/main.py` para permitir orígenes de desarrollo (Vite). Reinicié Uvicorn.
  - Instalé dependencias en el virtualenv del proyecto: `passlib[bcrypt]`, `bcrypt`, `PyJWT`.
  - Resolví varios errores de ejecución: `sqlalchemy` requiere `text()` para consultas crudas; en verificación de contraseña usé `bcrypt.checkpw` para evitar problema de backend de passlib.

Estado actual y pendientes importantes:

- Login: funcional. Se puede iniciar sesión con `richard` / `temporal`. Backend devuelve `access_token` y cookie `refresh`.
- Frontend: se añadió UI de login y se guarda `accessToken` en memoria; aún faltaba leer el rol del usuario tras login (esto se implementó a continuación).
- Seguridad: las comprobaciones de rol aún no están forzadas en rutas críticas. Recomendado: proteger endpoints con `Depends(get_current_user)` y chequear `id_rol` en servidor.
- Migraciones: se creó tabla `pedido_items` desde el router si no existía; se recomienda usar Alembic para cambios de esquema.

Archivos cambiados (resumen):

- Frontend/src/App.tsx — UI, login, producto placeholder, envío de pedidos.
- Backend/app/routers/pedidos.py — persistencia pedidos + items.
- Backend/app/routers/usuarios.py — login, me, uso bcrypt.
- Backend/app/auth.py — helpers JWT.
- Backend/app/main.py — CORS middleware.
- Backend/scripts/set_user_password.py — script utilitario para hashes.

Pruebas realizadas manualmente:

- Compilación frontend: `npm run build` (ok tras cambios).
- Llamada directa a `/usuarios/login` con `curl` desde terminal comprobando `access_token` y cookie `refresh` (ok).
- Script `set_user_password.py` ejecutado para actualizar `richard`.

Recomendaciones próximas:

1. Forzar roles en backend: añadir decoradores/depends para endpoints críticos (p. ej. `POST /pedidos/`, rutas de administración).
2. Implementar `/auth/refresh` que lea cookie `refresh` y emita nuevo `access_token` (rotación opcional).
3. Frontend: manejar 401 llamando a `/auth/refresh` y reintentar (UX transparente).
4. Añadir pruebas automáticas y migraciones (Alembic) para cambios en esquema.

---
s
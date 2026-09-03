---
tipo: MOC
proyecto: Byeburger
actualizado: 2026-08-31
---

# Byeburger — Plan (Índice)

Mapa de trabajo del POS Byeburger. Cada nota está enlazada; abre este vault en Obsidian y usa la vista de grafo o [[Mapa.canvas|el Canvas]] para ver todo conectado.

## Mapa

```mermaid
graph TD
  IDX["00 Índice"] --> ROAD["Roadmap"]
  IDX --> DEC["Decisiones"]
  IDX --> ADM["Administración (estructura)"]
  IDX --> DATA["Modelo de datos"]
  IDX --> Q["Preguntas abiertas"]
  IDX --> GLO["Glosario"]

  ROAD --> T1["01 Eliminar suave"]
  ROAD --> T2["02 Login"]
  ROAD --> T3["03 Rediseño visual ERP"]
  ROAD --> T4["04 Inventario"]
  ADM --> T4

  T4 --> INS["Insumos"]
  T4 --> REC["Recetas"]
  T4 --> MOV["Movimientos de inventario"]
  T4 --> MER["Mermas"]
  T4 --> COS["Costeo promedio ponderado"]
  T4 --> PRE["Cálculo de precios y ganancias"]
  T4 --> FAS["Fases inventario"]

  INS --> COS
  REC --> PRE
  INS --> PRE
  MOV --> INS
  MER --> MOV
  DATA --> INS
  DATA --> REC
  DATA --> MOV
```

## Tareas

1. [[01 - Eliminar suave (Usuarios y Sucursales)]]
2. [[02 - Login]]
3. [[03 - Rediseño visual ERP]]
4. [[04 - Inventario]]

## Referencia

- [[Roadmap]] — orden y estado
- [[Decisiones]] — decisiones cerradas
- [[Administración (estructura)]] — cómo se organiza el sidebar de `/admin`
- [[Modelo de datos]] — tablas actuales y nuevas
- [[Preguntas abiertas]] — lo que falta confirmar
- [[Glosario]] — términos

## Contexto del repo

- Backend: FastAPI + SQLAlchemy (SQL crudo con `text()`), Postgres. Routers en `Backend/app/routers/`.
- Frontend: React + TS + Vite. POS en `Frontend/src/pages/PosPage.tsx`, admin en `Frontend/src/pages/admin/`.
- Auth: JWT, roles `ADMIN=1`, `SUPERVISOR=2`, `CAJERO=3` (`Frontend/src/api/auth.ts`, `Backend/app/rbac.py`).
- Migraciones: Alembic en `alembic/versions/` (solo 2 hasta ahora).

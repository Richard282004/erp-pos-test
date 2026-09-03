---
tipo: referencia
estado: en progreso
actualizado: 2026-08-31
---

# Administración (estructura)

Relacionado: [[00 - Índice]] · [[04 - Inventario]] · [[Roadmap]]

Cómo se organiza el sidebar de `/admin`. Hoy es una lista plana (Usuarios, Sucursales). Pasa a tener **grupos con encabezado**.

## Nuevo sidebar

```
ADMINISTRACIÓN
│
├─ Recursos
│   ├─ 👤 Usuarios y roles
│   ├─ 🏪 Sucursales
│   └─ 🧾 Cajas                 (nuevo) — agregar/editar/eliminar cajas por sucursal
│
└─ Inventario
    ├─ 🧂 Insumos               nuevo — stock, mínimo, costo promedio
    ├─ 📥 Compras               nuevo — registrar compra (sube stock + recalcula costo)
    └─ 🍔 Recetas               nuevo — insumos de cada producto → costo / margen / precio sugerido
```

Grupos futuros: **Reportes** (F4), quizá **Caja / Turnos**.

## Implementación

- `Frontend/src/pages/admin/adminModules.tsx`: pasa de `ADMIN_MODULES: AdminModule[]` a `ADMIN_GROUPS: { label, modules: AdminModule[] }[]`.
- `AdminLayout.tsx`: renderiza encabezado de grupo + links.
- `App.tsx`: las rutas se arman aplanando los grupos (`ADMIN_GROUPS.flatMap(g => g.modules)`).

Los módulos nuevos de Inventario se detallan en [[04 - Inventario]] y [[Fases inventario]].

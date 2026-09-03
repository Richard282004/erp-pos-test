---
tipo: decisiones
actualizado: 2026-08-31
---

# Decisiones cerradas

| Tema | Decisión | Detalle |
|---|---|---|
| Eliminar usuarios/sucursales | **Borrado suave** | `activo = FALSE`. Nada de DELETE de fila. Ver [[01 - Eliminar suave (Usuarios y Sucursales)]] |
| Acceso a ventas | **Bloqueadas sin sesión** | Sin token redirige a `/login`. Ver [[02 - Login]] |
| Login | **Página aparte `/login`** | No modal. Diseño lindo, centrado. Ver [[02 - Login]] |
| Estilo visual | **Turno noche + tema claro/oscuro con toggle** | IBM Plex Sans/Mono, acento ámbar, tablas cómodas. Ver [[03 - Rediseño visual ERP]] |
| Costeo de productos | **Por receta de insumos** | El costo sale de sumar insumos, no se escribe a mano. Ver [[Recetas]] |
| Método de costeo | **Promedio ponderado** | Cuando cambia el precio de compra. Ver [[Costeo promedio ponderado]] |
| Estructura de Administración | **Grupos: Recursos + Inventario** | Sidebar con encabezados. Ver [[Administración (estructura)]] |
| Unidades de insumo | **Unidad base chica (g/ml/u) + conversión al comprar** | Comprás "1 kg" y el sistema pasa a gramos. Ver [[Insumos]] |
| Descuento de stock al vender | **Recién en F2** | En F1 el stock se mueve solo por compra / ajuste / merma manuales. Ver [[Fases inventario]] |
| Proveedores | **Recién en F4** | Por ahora `compras.proveedor` es texto libre. Ver [[Modelo de datos]] |

## Pendiente de confirmar

Va en [[Preguntas abiertas]].

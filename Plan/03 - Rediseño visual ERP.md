---
tipo: tarea
estado: hecho
prioridad: 3
---

# 03 — Rediseño visual ERP

Relacionado: [[Roadmap]] · [[02 - Login]] · [[04 - Inventario]]

## Objetivo

Que toda la app se vea moderna, limpia y profesional — estilo ERP / panel de administración. Consistente entre POS y Admin.

## Maqueta de direcciones

Artefacto publicado con 3 direcciones (01 Plancha / 02 Turno noche / 03 Ticket): https://claude.ai/code/artifact/c843c497-7ef5-4901-9f8d-ab919734a80d

Cada una: paleta (6 hex), tipografía (display/texto/mono), maqueta de POS + tabla admin. Falta que el usuario elija dirección + tema (claro/oscuro/ambos) + densidad de tablas.

## Enfoque

1. **Mockup primero** — 2-3 direcciones visuales (ej: claro minimal / oscuro moderno / híbrido con acento cálido). Elegir una antes de tocar CSS.
2. **Sistema de tokens** en CSS (`Frontend/src/App.css` o archivo nuevo `theme.css`):
   - Colores: fondo, superficie, borde, texto, texto-suave, primario, éxito, alerta, peligro.
   - Tipografía: fuente web (Google Fonts), escala de tamaños, pesos.
   - Sombras, radios, espaciado (escala 4/8px).
3. **Componentes a refrescar:**
   - Topbar + drawer lateral (ya existe estructura de la sesión anterior).
   - Tabs de categoría, cards de producto, grilla.
   - Carrito (`components/carrito/`).
   - Botones (primario / secundario / peligro / icono).
   - Modales (`AddProductModal`, `EditUsuarioModal`, `SucursalModal`) — unificar estilo.
   - Tablas admin (`admin-tabla`) — estilo ERP: filas zebra, header sticky, densidad compacta.
   - Formularios admin.
4. **Layout admin**: sidebar fija + contenido; breadcrumb; título de módulo consistente.

## Principios ERP

- Densidad de información alta pero legible.
- Jerarquía clara con tipografía y espaciado, no con muchos colores.
- Un color de acento, el resto neutros.
- Estados visibles: activo/inactivo, stock bajo ([[Insumos]]), cargando, error.

## Archivos (aprox)

- `Frontend/src/App.css` / nuevo `Frontend/src/theme.css`
- `Frontend/src/pages/admin/Admin.css`
- Todos los componentes de `Frontend/src/components/`

## Pregunta

Ver [[Preguntas abiertas]]: ¿armo el mockup de opciones?

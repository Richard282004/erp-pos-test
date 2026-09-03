---
tipo: tarea
estado: hecho
prioridad: 2
---

# 02 — Login

Relacionado: [[Roadmap]] · [[Decisiones]] · [[03 - Rediseño visual ERP]]

## Objetivo

1. Página de login separada en `/login`, con buen diseño.
2. Bloquear ventas (cobrar pedido) si no hay sesión.

## Estado actual

- `LoginForm.tsx` es un botón que despliega inputs, anidado, hoy metido en el drawer del POS.
- El POS se puede ver y usar sin sesión; `crearPedido` sí exige token pero la UI no lo impide antes.
- `RequireAdmin.tsx` ya existe como guard para `/admin`.

## Diseño de `/login`

- Ruta nueva en `Frontend/src/App.tsx`.
- Layout: pantalla completa, fondo con gradiente / imagen (`assets/hero.png`), card centrada.
- Contenido card: logo 🍔 Byeburger, título, campo Usuario, campo Contraseña, botón "Entrar" (estado "Entrando…"), error legible.
- Al éxito: guardar token (contexto auth existente) y redirigir a `/` o a la ruta previa.
- Usa tokens de [[03 - Rediseño visual ERP]] (colores, tipografía, sombras).

## Guard de ventas

- Nuevo componente `RequireAuth` (análogo a `RequireAdmin`) — envuelve rutas que exigen sesión.
- Decisión: el **POS sigue visible** sin sesión (ver catálogo), pero:
  - Botón "Cobrar" deshabilitado + tooltip "Iniciá sesión para cobrar".
  - O banner "Iniciá sesión" que lleva a `/login`.
- Alternativa más estricta (a evaluar): redirigir todo `/` a `/login` sin token.

## Cambios en el drawer del POS

- Deslogueado: el drawer muestra link "Iniciar sesión" → `/login` (quitar `LoginForm` inline).
- Logueado: usuario + rol + "Cerrar sesión" (ya está).

## Archivos

- `Frontend/src/App.tsx` — ruta `/login`
- `Frontend/src/pages/LoginPage.tsx` — nueva
- `Frontend/src/components/auth/RequireAuth.tsx` — nueva
- `Frontend/src/components/auth/LoginForm.tsx` — simplificar o absorber en LoginPage
- `Frontend/src/pages/PosPage.tsx` — drawer + botón cobrar
- `Frontend/src/context/` — helper de "ruta previa" si hace falta

## Pregunta

Ver [[Preguntas abiertas]]: ¿POS visible sin sesión o redirección dura a `/login`?

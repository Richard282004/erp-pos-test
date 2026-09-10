# Encuadre de fotos — dos técnicas para portar

Problema: subís una foto de un producto (o un avatar, o un banner) con
proporción y encuadre cualquiera, y la tenés que mostrar en un marco de
proporción fija (una tarjeta cuadrada, un hero 16:9) **sin que se vea
deformada ni cortada donde no querés**.

Hay dos formas de resolverlo. Este doc trae las dos con el código exacto y la
matemática, para copiar a otro proyecto.

| | Opción A — encuadre en el navegador | Opción B — recorte con canvas |
|---|---|---|
| Qué guardás | 3 números: `position_x`, `position_y` (0–100), `zoom` (1–3) | un archivo ya recortado a cuadrado |
| Toca la imagen | No | Sí (genera un archivo nuevo) |
| Se puede re-encuadrar después | Sí, cambiando los números | Solo si guardaste el original aparte |
| Sirve para varias proporciones a la vez | Sí | No, la proporción queda horneada |
| Peso que viaja al visitante | la imagen original completa | el recorte (más liviano) |
| Procesamiento al subir | Cero | Un `drawImage` en canvas |

**Recomendada: Opción A.** Es la más simple, no destruye nada y el mismo dato
sirve para mostrar la foto en cualquier marco. La B conviene si necesitás que
el archivo sea chico y con proporción única (ej. subir a un bucket con límite,
o servir a un cliente que hace `<img>` a secas).

---

## Opción A — encuadre en el navegador (recomendada)

### La idea

No se toca el archivo. Se guardan 3 números y el navegador encuadra al vuelo con
CSS: `object-fit: cover` escala la imagen para tapar el marco, `object-position`
elige **qué parte** se ve, y `transform: scale` hace el zoom.

### Cómo funciona `object-position` (la parte que confunde)

`object-position: 25% 75%` significa: *alineá el punto que está al 25% del ancho
de la imagen con el punto que está al 25% del ancho del marco* (y 75% en
vertical). Consecuencias:

- `0% 0%` → se ve la esquina **superior izquierda** de la imagen.
- `50% 50%` → **centrada** (el default).
- `100% 100%` → esquina **inferior derecha**.

Solo tiene efecto cuando la imagen **desborda** el marco, cosa que `cover`
garantiza salvo que las proporciones coincidan exactas.

### Base de datos

```sql
ALTER TABLE productos
  ADD COLUMN encuadre_x  SMALLINT NOT NULL DEFAULT 50,   -- 0..100
  ADD COLUMN encuadre_y  SMALLINT NOT NULL DEFAULT 50,   -- 0..100
  ADD COLUMN encuadre_zoom NUMERIC(3,2) NOT NULL DEFAULT 1.0;  -- 1.00..3.00
```

Con los defaults (50, 50, 1) el comportamiento es idéntico a un
`object-fit: cover` centrado normal: se puede agregar sin migrar datos ni tocar
las fotos que ya existen.

### Mostrar la foto

```css
/* El marco define la proporción y recorta lo que sobra. */
.marco {
  aspect-ratio: 1 / 1;          /* o 4/3, 16/9, lo que necesites */
  overflow: hidden;
  border-radius: 12px;
}

.marco img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: var(--enc-x) var(--enc-y);
  transform: scale(var(--enc-zoom));
  /* El zoom se hace HACIA el punto encuadrado, no hacia el centro:
     así el foco no se te escapa al hacer zoom. */
  transform-origin: var(--enc-x) var(--enc-y);
  display: block;
}
```

```tsx
type Encuadre = { x: number; y: number; zoom: number }; // x,y: 0..100 ; zoom: 1..3

function FotoEncuadrada({
  src,
  alt,
  encuadre = { x: 50, y: 50, zoom: 1 },
}: {
  src: string;
  alt: string;
  encuadre?: Encuadre;
}) {
  return (
    <div
      className="marco"
      style={
        {
          "--enc-x": `${encuadre.x}%`,
          "--enc-y": `${encuadre.y}%`,
          "--enc-zoom": encuadre.zoom,
        } as React.CSSProperties
      }
    >
      <img src={src} alt={alt} />
    </div>
  );
}
```

Eso es todo lo que necesita el lado de mostrar. El mismo `<img>` con los mismos
3 números se ve bien en una tarjeta cuadrada, en un hero ancho o en un thumbnail
— cambiás solo el `aspect-ratio` del marco.

### Editor de encuadre (arrastrar para mover + slider de zoom)

```tsx
import { useRef, useState } from "react";

type Encuadre = { x: number; y: number; zoom: number };

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function EditorEncuadre({
  src,
  valor,
  onChange,
}: {
  src: string;
  valor: Encuadre;
  onChange: (e: Encuadre) => void;
}) {
  const marcoRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const arrastre = useRef<{ x: number; y: number; ex: number; ey: number } | null>(null);
  const [tam, setTam] = useState({ nat: [1, 1], box: [1, 1] });

  // Cuánto puede desplazarse la imagen dentro del marco, en px, por eje.
  // Es lo que separa "object-position: 0%" de "object-position: 100%".
  function overflow() {
    const [natW, natH] = tam.nat;
    const [boxW, boxH] = tam.box;
    const cover = Math.max(boxW / natW, boxH / natH); // escala de object-fit: cover
    const s = cover * valor.zoom;
    return { ox: Math.max(0, natW * s - boxW), oy: Math.max(0, natH * s - boxH) };
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    arrastre.current = { x: e.clientX, y: e.clientY, ex: valor.x, ey: valor.y };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!arrastre.current) return;
    const { ox, oy } = overflow();
    const dx = e.clientX - arrastre.current.x;
    const dy = e.clientY - arrastre.current.y;
    // Arrastrar a la derecha (+dx) muestra MÁS de la izquierda de la foto,
    // o sea baja el %. De ahí el signo negativo.
    const nx = ox ? clamp(arrastre.current.ex - (dx / ox) * 100, 0, 100) : 50;
    const ny = oy ? clamp(arrastre.current.ey - (dy / oy) * 100, 0, 100) : 50;
    onChange({ ...valor, x: nx, y: ny });
  }

  function onPointerUp() {
    arrastre.current = null;
  }

  function medir() {
    const box = marcoRef.current?.getBoundingClientRect();
    const img = imgRef.current;
    if (box && img) {
      setTam({
        nat: [img.naturalWidth || 1, img.naturalHeight || 1],
        box: [box.width || 1, box.height || 1],
      });
    }
  }

  return (
    <div className="editor-encuadre">
      <div
        ref={marcoRef}
        className="marco"
        style={{ touchAction: "none", cursor: "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <img
          ref={imgRef}
          src={src}
          alt=""
          draggable={false}
          onLoad={medir}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: `${valor.x}% ${valor.y}%`,
            transform: `scale(${valor.zoom})`,
            transformOrigin: `${valor.x}% ${valor.y}%`,
          }}
        />
      </div>

      <label>
        Zoom
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={valor.zoom}
          onChange={(e) => onChange({ ...valor, zoom: Number(e.target.value) })}
        />
      </label>

      <button type="button" onClick={() => onChange({ x: 50, y: 50, zoom: 1 })}>
        Centrar
      </button>
    </div>
  );
}
```

Notas:

- `touch-action: none` en el marco evita que el gesto de arrastre haga scroll en
  el celular.
- Volvé a llamar a `medir()` en `resize` si el marco puede cambiar de tamaño.
- Guardás `valor` en la base tal cual (redondeá `x`/`y` a entero antes).

---

## Opción B — recorte a cuadrado con `<canvas>` antes de subir

### La idea

Un diálogo (`image-crop-dialog.tsx`) muestra la imagen en un cuadrado con el
mismo gesto de mover + zoom que el editor de arriba. Al confirmar, un `<canvas>`
dibuja **solo la región visible** y devuelve un `Blob` cuadrado que ya subís.
El archivo final es chico y con proporción única; el que lo muestra hace
`<img>` a secas.

### La matemática del recorte

Datos al confirmar:

- `natW`, `natH` — tamaño natural (en px) de la imagen original.
- `V` — lado del cuadrado del visor (en px de pantalla).
- `zoom` (Z) y `posX`, `posY` (0–100) — lo mismo que en la Opción A.
- `S` — lado del cuadrado de salida que querés (ej. 512 o 1024).

Pasos:

```
cover = max(V / natW, V / natH)     // escala base para tapar el cuadrado a zoom 1
s     = cover * Z                   // escala efectiva con el zoom aplicado
rw    = natW * s                    // ancho de la imagen renderizada
rh    = natH * s                    // alto
ox    = max(0, rw - V)              // cuánto sobra por los lados
oy    = max(0, rh - V)              // cuánto sobra arriba/abajo

// Esquina de la región visible, en px de la imagen RENDERIZADA:
visX  = (posX / 100) * ox
visY  = (posY / 100) * oy

// Pasar de px renderizados a px de la imagen NATURAL: dividir por s.
sx    = visX / s
sy    = visY / s
sw    = V / s                       // ancho/alto de la región a recortar, en px naturales
sh    = V / s
```

`sx, sy, sw, sh` es exactamente el 5.º–8.º argumento de `drawImage`.

### El código

```tsx
export async function recortarACuadrado(
  file: File,
  enc: { x: number; y: number; zoom: number },
  visor: number,        // V: lado del visor en px con el que el usuario encuadró
  salida = 512,         // S: lado del PNG/WebP de salida
  formato: "image/webp" | "image/jpeg" | "image/png" = "image/webp",
  calidad = 0.9,
): Promise<Blob> {
  // createImageBitmap respeta la orientación EXIF (fotos de celular giradas).
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const natW = bmp.width;
  const natH = bmp.height;

  const cover = Math.max(visor / natW, visor / natH);
  const s = cover * enc.zoom;
  const rw = natW * s;
  const rh = natH * s;
  const ox = Math.max(0, rw - visor);
  const oy = Math.max(0, rh - visor);

  const sx = ((enc.x / 100) * ox) / s;
  const sy = ((enc.y / 100) * oy) / s;
  const sw = visor / s;
  const sh = visor / s;

  const canvas = document.createElement("canvas");
  canvas.width = salida;
  canvas.height = salida;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, salida, salida);
  bmp.close();

  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob devolvió null"))), formato, calidad),
  );
}
```

El diálogo en sí reutiliza el `EditorEncuadre` de la Opción A (con el marco
`aspect-ratio: 1/1`), guarda el `visor` = ancho real del marco en px al momento
de confirmar, y llama a `recortarACuadrado(file, enc, visor)`. El `Blob` que
devuelve se sube igual que cualquier archivo.

### Detalles que muerden

- **EXIF / orientación.** `createImageBitmap(file, { imageOrientation: "from-image" })`
  ya corrige las fotos de celular que salen giradas. Si usás un `<img>` +
  `img.decode()` en vez de `createImageBitmap`, la mayoría de los navegadores
  hoy también auto-orientan, pero es menos predecible.
- **`visor` tiene que ser el mismo** con el que el usuario encuadró. Si el marco
  es responsive, medí su ancho real (`getBoundingClientRect().width`) justo
  antes de recortar, no un valor fijo.
- **WebP** pesa ~30% menos que JPEG a calidad equivalente y lo soportan todos
  los navegadores desde hace años. PNG solo si necesitás transparencia.
- **DPI / pantallas retina:** si el visor mide 300 px CSS pero querés salida de
  600, no cambia la matemática — `S` es independiente de `V`. Subí `S` y listo.

---

## Cómo encajaría en este proyecto

Hoy `ProductoCard` y `ConfirmarProducto` usan `ImageWithFallback`, que hace un
`<img>` plano con `object-fit: cover` **centrado** (sin encuadre por foto).

Para sumar la Opción A:

1. Migración con las 3 columnas en `productos` (arriba).
2. `ImageWithFallback` (o un `FotoEncuadrada` nuevo) que aplique las variables
   CSS de encuadre; los productos sin datos usan `50/50/1` y se ven igual que
   ahora.
3. En el form de producto del admin, un `EditorEncuadre` debajo del selector de
   imagen.

La Opción B tendría sentido si en algún momento se sirve el catálogo a una app
o a un menú público donde no controlás el `<img>` y querés archivos chicos y
cuadrados sí o sí.

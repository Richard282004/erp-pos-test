import { useState } from "react";

const IMG_PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='100%' height='100%' fill='%23f3f3f3'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23888' font-size='20'>Sin imagen</text></svg>";

type Props = {
  src: string | null | undefined;
  alt: string;
  /** Encuadre guardado en la DB (0-100, default 50 = centrado). */
  encuadreX?: number;
  encuadreY?: number;
  /** Zoom guardado en la DB (>=1, default 1 = sin zoom). */
  encuadreZoom?: number;
};

function Img({ src, alt, encuadreX = 50, encuadreY = 50, encuadreZoom = 1 }: Props) {
  // `fallo` se resetea solo: el wrapper remonta este componente cuando cambia
  // `src` (via key), así no hace falta sincronizar con un efecto.
  const [fallo, setFallo] = useState(false);
  const url = fallo || !src ? IMG_PLACEHOLDER : src;
  const posicion = `${encuadreX}% ${encuadreY}%`;
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFallo(true)}
      style={
        fallo || !src
          ? undefined
          : {
              objectPosition: posicion,
              transform: `scale(${encuadreZoom})`,
              transformOrigin: posicion,
            }
      }
    />
  );
}

export function ImageWithFallback(props: Props) {
  return <Img key={props.src ?? ""} {...props} />;
}

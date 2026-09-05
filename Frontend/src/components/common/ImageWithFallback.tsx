import { useState } from "react";

const IMG_PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='100%' height='100%' fill='%23f3f3f3'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23888' font-size='20'>Sin imagen</text></svg>";

type Props = {
  src: string | null | undefined;
  alt: string;
};

function Img({ src, alt }: Props) {
  // `fallo` se resetea solo: el wrapper remonta este componente cuando cambia
  // `src` (via key), así no hace falta sincronizar con un efecto.
  const [fallo, setFallo] = useState(false);
  const url = fallo || !src ? IMG_PLACEHOLDER : src;
  return <img src={url} alt={alt} onError={() => setFallo(true)} />;
}

export function ImageWithFallback(props: Props) {
  return <Img key={props.src ?? ""} {...props} />;
}

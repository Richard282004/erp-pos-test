import { useEffect, useState } from "react";

const IMG_PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='100%' height='100%' fill='%23f3f3f3'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23888' font-size='20'>Sin imagen</text></svg>";

export function ImageWithFallback({
  src,
  alt,
}: {
  src: string | null | undefined;
  alt: string;
}) {
  const [imgSrc, setImgSrc] = useState<string>(src ?? IMG_PLACEHOLDER);

  useEffect(() => {
    setImgSrc(src ?? IMG_PLACEHOLDER);
  }, [src]);

  return <img src={imgSrc} alt={alt} onError={() => setImgSrc(IMG_PLACEHOLDER)} />;
}

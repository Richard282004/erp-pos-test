import { useEffect, useState } from "react";

/**
 * navigator.onLine solo detecta "sin adaptador de red" (modo avión, WiFi
 * apagado) — no un router sin internet real. Sirve igual como primera señal
 * clara: si el navegador ya sabe que no hay red, ni vale la pena intentar
 * cobrar.
 */
export function useConexion(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  useEffect(() => {
    const marcarOnline = () => setOnline(true);
    const marcarOffline = () => setOnline(false);
    window.addEventListener("online", marcarOnline);
    window.addEventListener("offline", marcarOffline);
    return () => {
      window.removeEventListener("online", marcarOnline);
      window.removeEventListener("offline", marcarOffline);
    };
  }, []);

  return online;
}

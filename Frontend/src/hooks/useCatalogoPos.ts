import { useCallback, useEffect, useState } from "react";
import { listarProductos, listarCategorias, type Producto, type Categoria } from "../api/productos";
import {
  listarModificadores,
  modificadoresPorProducto,
  type Modificador,
} from "../api/modificadores";
import { obtenerEmisor, type DatosEmisor } from "../api/empresa";
import { useRecurso } from "./useRecurso";

/**
 * Todo lo que el POS necesita del backend para armar el catálogo: productos,
 * categorías, modificadores y los datos del emisor para el ticket. Cada fetch
 * trae su propio guard para no escribir en un componente ya desmontado.
 */
export function useCatalogoPos(accessToken: string | null) {
  const cargadorProductos = useCallback(
    () => (accessToken ? listarProductos(accessToken) : Promise.resolve<Producto[]>([])),
    [accessToken],
  );
  const {
    datos: productos,
    loading: loadingProductos,
    error: errorProductos,
    refetch: recargarProductos,
  } = useRecurso<Producto[]>(cargadorProductos, "Error cargando productos", []);

  const [categoriasBackend, setCategoriasBackend] = useState<Categoria[]>([]);
  const [emisor, setEmisor] = useState<DatosEmisor | null>(null);
  const [modsMap, setModsMap] = useState<Record<number, Modificador>>({});
  const [modsPorProducto, setModsPorProducto] = useState<Record<string, number[]>>({});

  useEffect(() => {
    if (!accessToken) return;
    let ignore = false;

    listarCategorias(accessToken)
      .then((data) => {
        if (!ignore) setCategoriasBackend(data);
      })
      .catch(() => {});

    obtenerEmisor(accessToken)
      .then((e) => {
        if (!ignore) setEmisor(e);
      })
      .catch(() => {});

    Promise.all([listarModificadores(accessToken), modificadoresPorProducto(accessToken)])
      .then(([mods, asoc]) => {
        if (ignore) return;
        setModsMap(Object.fromEntries(mods.map((m) => [m.id_modificador, m])));
        setModsPorProducto(asoc);
      })
      .catch((err) => console.warn("No se pudieron cargar modificadores", err));

    return () => {
      ignore = true;
    };
  }, [accessToken]);

  return {
    productos,
    loadingProductos,
    errorProductos,
    recargarProductos,
    categoriasBackend,
    emisor,
    modsMap,
    modsPorProducto,
  };
}

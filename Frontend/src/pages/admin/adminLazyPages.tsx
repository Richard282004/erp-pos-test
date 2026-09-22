import { lazy } from "react";

// Cada módulo de admin en su propio chunk: quien solo usa el POS nunca
// descarga este código (son ~4800 líneas de páginas de administración).
// Separado de adminModules.tsx porque ese archivo también exporta datos
// y funciones, lo que rompe react-refresh si mezcla componentes acá.
export const DashboardPage = lazy(() => import("./DashboardPage").then((m) => ({ default: m.DashboardPage })));
export const InformesPage = lazy(() => import("./InformesPage").then((m) => ({ default: m.InformesPage })));
export const PedidosPage = lazy(() => import("./PedidosPage").then((m) => ({ default: m.PedidosPage })));
export const TurnosPage = lazy(() => import("./TurnosPage").then((m) => ({ default: m.TurnosPage })));
export const CategoriasPage = lazy(() => import("./CategoriasPage").then((m) => ({ default: m.CategoriasPage })));
export const ModificadoresPage = lazy(() =>
  import("./ModificadoresPage").then((m) => ({ default: m.ModificadoresPage }))
);
export const RecetasPage = lazy(() => import("./RecetasPage").then((m) => ({ default: m.RecetasPage })));
export const InsumosPage = lazy(() => import("./InsumosPage").then((m) => ({ default: m.InsumosPage })));
export const ComprasPage = lazy(() => import("./ComprasPage").then((m) => ({ default: m.ComprasPage })));
export const UsuariosPage = lazy(() => import("./UsuariosPage").then((m) => ({ default: m.UsuariosPage })));
export const SucursalesPage = lazy(() => import("./SucursalesPage").then((m) => ({ default: m.SucursalesPage })));
export const CajasPage = lazy(() => import("./CajasPage").then((m) => ({ default: m.CajasPage })));
export const NegocioPage = lazy(() => import("./NegocioPage").then((m) => ({ default: m.NegocioPage })));
export const AparienciaPage = lazy(() => import("./AparienciaPage").then((m) => ({ default: m.AparienciaPage })));
export const FacturacionPage = lazy(() =>
  import("./FacturacionPage").then((m) => ({ default: m.FacturacionPage }))
);
export const AuditoriaPage = lazy(() => import("./AuditoriaPage").then((m) => ({ default: m.AuditoriaPage })));
export const MantenimientoPage = lazy(() =>
  import("./MantenimientoPage").then((m) => ({ default: m.MantenimientoPage }))
);

import type { ReactNode } from "react";
import { UsuariosPage } from "./UsuariosPage";
import { SucursalesPage } from "./SucursalesPage";
import { CajasPage } from "./CajasPage";
import { NegocioPage } from "./NegocioPage";
import { CategoriasPage } from "./CategoriasPage";
import { ModificadoresPage } from "./ModificadoresPage";
import { DashboardPage } from "./DashboardPage";
import { TurnosPage } from "./TurnosPage";
import { PedidosPage } from "./PedidosPage";
import { InsumosPage } from "./InsumosPage";
import { ComprasPage } from "./ComprasPage";
import { RecetasPage } from "./RecetasPage";
import { AuditoriaPage } from "./AuditoriaPage";
import { FacturacionPage } from "./FacturacionPage";
import { MantenimientoPage } from "./MantenimientoPage";
import type { CurrentUser } from "../../api/auth";
import { esAdmin, soloReportes } from "../../api/auth";

/** El rol REPORTES (solo lectura) ve únicamente estos módulos. */
const MODULOS_REPORTES = new Set(["dashboard", "pedidos", "turnos"]);

export type AdminModule = {
  path: string; // relativo a /admin
  label: string;
  icon: string;
  element: ReactNode;
  /** true = solo ADMIN. El resto lo ve también el supervisor. */
  soloAdmin?: boolean;
};

export type AdminGroup = {
  label: string;
  modules: AdminModule[];
};

export const ADMIN_GROUPS: AdminGroup[] = [
  {
    label: "Operación",
    modules: [
      { path: "dashboard", label: "Dashboard", icon: "📊", element: <DashboardPage /> },
      { path: "pedidos", label: "Pedidos", icon: "🧾", element: <PedidosPage /> },
      { path: "turnos", label: "Turnos de caja", icon: "💰", element: <TurnosPage /> },
    ],
  },
  {
    label: "Catálogo",
    modules: [
      { path: "categorias", label: "Categorías", icon: "🏷️", element: <CategoriasPage /> },
      { path: "modificadores", label: "Modificadores", icon: "➕", element: <ModificadoresPage /> },
      { path: "recetas", label: "Recetas", icon: "🍔", element: <RecetasPage /> },
    ],
  },
  {
    label: "Inventario",
    modules: [
      { path: "insumos", label: "Insumos", icon: "🧂", element: <InsumosPage /> },
      { path: "compras", label: "Compras", icon: "📥", element: <ComprasPage /> },
    ],
  },
  {
    // Configuración estructural: la API exige ADMIN para escribir en todo esto.
    label: "Recursos",
    modules: [
      { path: "usuarios", label: "Usuarios y roles", icon: "👤", element: <UsuariosPage />, soloAdmin: true },
      { path: "sucursales", label: "Sucursales", icon: "🏪", element: <SucursalesPage />, soloAdmin: true },
      { path: "cajas", label: "Cajas", icon: "🗄️", element: <CajasPage />, soloAdmin: true },
      { path: "negocio", label: "Datos del negocio", icon: "🏢", element: <NegocioPage />, soloAdmin: true },
      { path: "facturacion", label: "Facturación electrónica", icon: "🧾", element: <FacturacionPage />, soloAdmin: true },
      { path: "auditoria", label: "Auditoría", icon: "🕵️", element: <AuditoriaPage />, soloAdmin: true },
      { path: "mantenimiento", label: "Mantenimiento", icon: "🧹", element: <MantenimientoPage />, soloAdmin: true },
    ],
  },
];

// Lista plana — para armar las rutas.
export const ADMIN_MODULES: AdminModule[] = ADMIN_GROUPS.flatMap((g) => g.modules);

function puedeVer(user: CurrentUser, m: AdminModule): boolean {
  if (soloReportes(user)) return MODULOS_REPORTES.has(m.path);
  if (esAdmin(user)) return true;
  return !m.soloAdmin;
}

export function modulosVisibles(user: CurrentUser): AdminModule[] {
  return ADMIN_MODULES.filter((m) => puedeVer(user, m));
}

/** Grupos sin los módulos que el usuario no puede ver (y sin grupos vacíos). */
export function gruposVisibles(user: CurrentUser): AdminGroup[] {
  return ADMIN_GROUPS.map((g) => ({
    ...g,
    modules: g.modules.filter((m) => puedeVer(user, m)),
  })).filter((g) => g.modules.length > 0);
}

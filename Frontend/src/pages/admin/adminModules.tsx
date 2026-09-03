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
import type { CurrentUser } from "../../api/auth";
import { esAdmin } from "../../api/auth";

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
    ],
  },
];

// Lista plana — para armar las rutas.
export const ADMIN_MODULES: AdminModule[] = ADMIN_GROUPS.flatMap((g) => g.modules);

export function modulosVisibles(user: CurrentUser): AdminModule[] {
  return esAdmin(user) ? ADMIN_MODULES : ADMIN_MODULES.filter((m) => !m.soloAdmin);
}

/** Grupos sin los módulos que el usuario no puede ver (y sin grupos vacíos). */
export function gruposVisibles(user: CurrentUser): AdminGroup[] {
  if (esAdmin(user)) return ADMIN_GROUPS;
  return ADMIN_GROUPS.map((g) => ({
    ...g,
    modules: g.modules.filter((m) => !m.soloAdmin),
  })).filter((g) => g.modules.length > 0);
}

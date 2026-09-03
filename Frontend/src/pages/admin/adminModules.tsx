import type { ReactNode } from "react";
import { UsuariosPage } from "./UsuariosPage";
import { SucursalesPage } from "./SucursalesPage";
import { CajasPage } from "./CajasPage";
import { CategoriasPage } from "./CategoriasPage";
import { ModificadoresPage } from "./ModificadoresPage";
import { DashboardPage } from "./DashboardPage";
import { TurnosPage } from "./TurnosPage";
import { PedidosPage } from "./PedidosPage";
import { InsumosPage } from "./InsumosPage";
import { ComprasPage } from "./ComprasPage";
import { RecetasPage } from "./RecetasPage";

export type AdminModule = {
  path: string; // relativo a /admin
  label: string;
  icon: string;
  element: ReactNode;
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
    label: "Recursos",
    modules: [
      { path: "usuarios", label: "Usuarios y roles", icon: "👤", element: <UsuariosPage /> },
      { path: "sucursales", label: "Sucursales", icon: "🏪", element: <SucursalesPage /> },
      { path: "cajas", label: "Cajas", icon: "🗄️", element: <CajasPage /> },
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
];

// Lista plana — para armar las rutas y el redirect por defecto.
export const ADMIN_MODULES: AdminModule[] = ADMIN_GROUPS.flatMap((g) => g.modules);

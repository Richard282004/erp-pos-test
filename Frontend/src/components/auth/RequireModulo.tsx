import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { modulosVisibles } from "../../pages/admin/adminModules";

/** Bloquea el acceso por URL a un módulo de admin que el rol actual no puede ver
 *  (p. ej. el rol REPORTES entrando a /admin/categorias). */
export function RequireModulo({ path, children }: { path: string; children: ReactNode }) {
  const { currentUser } = useAuth();
  const permitido = modulosVisibles(currentUser).some((m) => m.path === path);
  if (!permitido) return <Navigate to="/admin/dashboard" replace />;
  return <>{children}</>;
}

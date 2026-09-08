import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { puedeEntrarAdmin } from "../../api/auth";
import { useAuth } from "../../context/useAuth";

/** Panel de administración: entran ADMIN, SUPERVISOR y REPORTES (solo lectura).
 *  Los módulos marcados soloAdmin se filtran aparte con RequireAdmin, y
 *  adminModules limita qué ve el rol REPORTES. */
export function RequireGestor({ children }: { children: ReactNode }) {
  const { accessToken, currentUser, restaurando } = useAuth();
  const location = useLocation();

  if (restaurando) {
    return <div className="pos-cargando">Cargando…</div>;
  }
  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!puedeEntrarAdmin(currentUser)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

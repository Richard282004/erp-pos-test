import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { puedeGestionarProductos } from "../../api/auth";
import { useAuth } from "../../context/useAuth";

/** Panel de administración: entran ADMIN y SUPERVISOR.
 *  Los módulos marcados soloAdmin se filtran aparte con RequireAdmin. */
export function RequireGestor({ children }: { children: ReactNode }) {
  const { accessToken, currentUser, restaurando } = useAuth();
  const location = useLocation();

  if (restaurando) {
    return <div className="pos-cargando">Cargando…</div>;
  }
  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!puedeGestionarProductos(currentUser)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

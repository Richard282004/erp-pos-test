import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { puedeOperarPos } from "../../api/auth";
import { useAuth } from "../../context/useAuth";

/** El POS es para cobrar. El rol REPORTES (solo lectura) se manda al panel. */
export function RequirePos({ children }: { children: ReactNode }) {
  const { currentUser, restaurando } = useAuth();
  if (restaurando) return <div className="pos-cargando">Cargando…</div>;
  if (!puedeOperarPos(currentUser)) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <>{children}</>;
}

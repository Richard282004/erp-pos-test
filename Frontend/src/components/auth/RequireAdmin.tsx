import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { esAdmin } from "../../api/auth";
import { useAuth } from "../../context/useAuth";

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { accessToken, currentUser, restaurando } = useAuth();
  const location = useLocation();

  if (restaurando) {
    return <div className="pos-cargando">Cargando…</div>;
  }
  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!esAdmin(currentUser)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

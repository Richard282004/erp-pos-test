import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { accessToken, restaurando } = useAuth();
  const location = useLocation();

  if (restaurando) {
    return <div className="pos-cargando">Cargando…</div>;
  }
  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

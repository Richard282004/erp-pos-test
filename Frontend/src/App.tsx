import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { PosPage } from "./pages/PosPage";
import { LoginPage } from "./pages/LoginPage";
import { ADMIN_MODULES } from "./pages/admin/adminModules";

const AdminLayout = lazy(() =>
  import("./pages/admin/AdminLayout").then((m) => ({ default: m.AdminLayout }))
);
import { RequireAdmin } from "./components/auth/RequireAdmin";
import { RequireGestor } from "./components/auth/RequireGestor";
import { RequireAuth } from "./components/auth/RequireAuth";
import { RequirePos } from "./components/auth/RequirePos";
import { RequireModulo } from "./components/auth/RequireModulo";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <RequirePos>
              <PosPage />
            </RequirePos>
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireGestor>
            <Suspense fallback={<div className="pos-cargando">Cargando…</div>}>
              <AdminLayout />
            </Suspense>
          </RequireGestor>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        {ADMIN_MODULES.map((m) => (
          <Route
            key={m.path}
            path={m.path}
            // Entrar por URL a un módulo que el rol no puede ver rebota al dashboard.
            element={
              m.soloAdmin ? (
                <RequireAdmin>{m.element}</RequireAdmin>
              ) : (
                <RequireModulo path={m.path}>{m.element}</RequireModulo>
              )
            }
          />
        ))}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

import { Link, NavLink, Outlet } from "react-router-dom";
import { gruposVisibles } from "./adminModules";
import { ThemeToggle } from "../../components/common/ThemeToggle";
import { useAuth } from "../../context/useAuth";
import { nombreRol, puedeOperarPos } from "../../api/auth";
import { APP_VERSION_TEXTO } from "../../lib/version";
import "./Admin.css";

export function AdminLayout() {
  const { currentUser } = useAuth();
  const grupos = gruposVisibles(currentUser);
  const mostrarVolverPos = puedeOperarPos(currentUser);

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-top">
          <span className="admin-marca">Administración</span>
          {mostrarVolverPos && (
            <Link to="/" className="admin-volver" title="Volver al punto de venta">
              Volver al POS
            </Link>
          )}
        </div>
        <nav>
          {grupos.map((grupo) => (
            <div key={grupo.label} className="admin-nav-group">
              <span className="admin-nav-group-label">{grupo.label}</span>
              {grupo.modules.map((m) => (
                <NavLink
                  key={m.path}
                  to={m.path}
                  className={({ isActive }) => "admin-nav-link" + (isActive ? " activo" : "")}
                >
                  {m.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="admin-sidebar-pie">
          <span className="admin-pie-info">
            {nombreRol(currentUser)} · {APP_VERSION_TEXTO}
          </span>
          <ThemeToggle />
        </div>
      </aside>
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}

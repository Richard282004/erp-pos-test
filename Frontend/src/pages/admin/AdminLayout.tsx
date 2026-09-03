import { Link, NavLink, Outlet } from "react-router-dom";
import { gruposVisibles } from "./adminModules";
import { ThemeToggle } from "../../components/common/ThemeToggle";
import { useAuth } from "../../context/useAuth";
import { nombreRol } from "../../api/auth";
import "./Admin.css";

export function AdminLayout() {
  const { currentUser } = useAuth();
  const grupos = gruposVisibles(currentUser);

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Link to="/" className="admin-volver">← Volver al POS</Link>
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
                  {m.icon} {m.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="admin-sidebar-pie">
          <span className="admin-nav-group-label">{nombreRol(currentUser)}</span>
          <ThemeToggle />
        </div>
      </aside>
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}

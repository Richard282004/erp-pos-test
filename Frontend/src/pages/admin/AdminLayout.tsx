import { Link, NavLink, Outlet } from "react-router-dom";
import { ADMIN_GROUPS } from "./adminModules";
import { ThemeToggle } from "../../components/common/ThemeToggle";
import "./Admin.css";

export function AdminLayout() {
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Link to="/" className="admin-volver">← Volver al POS</Link>
        <nav>
          {ADMIN_GROUPS.map((grupo) => (
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
        <ThemeToggle />
      </aside>
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}

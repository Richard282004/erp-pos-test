import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { gruposVisibles } from "./adminModules";
import { ThemeToggle } from "../../components/common/ThemeToggle";
import { useAuth } from "../../context/useAuth";
import { nombreRol, puedeOperarPos } from "../../api/auth";
import { APP_VERSION_TEXTO } from "../../lib/version";
import "./Admin.css";

const CLAVE_COLAPSADA = "admin_sidebar_colapsada";
const CLAVE_GRUPOS_CERRADOS = "admin_grupos_cerrados";

function leerColapsada(): boolean {
  try {
    return localStorage.getItem(CLAVE_COLAPSADA) === "1";
  } catch {
    return false;
  }
}

function leerGruposCerrados(): Set<string> {
  try {
    const guardado = localStorage.getItem(CLAVE_GRUPOS_CERRADOS);
    return guardado ? new Set(JSON.parse(guardado)) : new Set();
  } catch {
    return new Set();
  }
}

export function AdminLayout() {
  const { currentUser } = useAuth();
  const grupos = gruposVisibles(currentUser);
  const mostrarVolverPos = puedeOperarPos(currentUser);

  const [colapsada, setColapsada] = useState(leerColapsada);
  const [gruposCerrados, setGruposCerrados] = useState(leerGruposCerrados);

  const alternarColapsada = () => {
    setColapsada((prev) => {
      const siguiente = !prev;
      try {
        localStorage.setItem(CLAVE_COLAPSADA, siguiente ? "1" : "0");
      } catch {
        /* localStorage no disponible, no pasa nada */
      }
      return siguiente;
    });
  };

  const alternarGrupo = (label: string) => {
    setGruposCerrados((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(label)) siguiente.delete(label);
      else siguiente.add(label);
      try {
        localStorage.setItem(CLAVE_GRUPOS_CERRADOS, JSON.stringify([...siguiente]));
      } catch {
        /* localStorage no disponible, no pasa nada */
      }
      return siguiente;
    });
  };

  return (
    <div className="admin-layout">
      <aside className={"admin-sidebar" + (colapsada ? " colapsada" : "")}>
        <div className="admin-sidebar-top">
          <div className="admin-sidebar-top-txt">
            <span className="admin-marca">Administración</span>
            {mostrarVolverPos && (
              <Link to="/" className="admin-volver" title="Volver al punto de venta">
                Volver al POS
              </Link>
            )}
          </div>
          <button
            type="button"
            className="admin-colapsar-btn"
            onClick={alternarColapsada}
            aria-label={colapsada ? "Expandir barra lateral" : "Colapsar barra lateral"}
            title={colapsada ? "Expandir" : "Colapsar"}
          >
            «
          </button>
        </div>
        <nav>
          {grupos.map((grupo) => {
            const cerrado = gruposCerrados.has(grupo.label);
            return (
              <div key={grupo.label} className={"admin-nav-group" + (cerrado ? " cerrado" : "")}>
                <button
                  type="button"
                  className="admin-nav-group-label"
                  onClick={() => alternarGrupo(grupo.label)}
                  aria-expanded={!cerrado}
                >
                  <span className="admin-nav-group-label-txt">{grupo.label}</span>
                  <span className="admin-nav-group-chevron" aria-hidden="true">
                    ▾
                  </span>
                </button>
                <div className="admin-nav-group-modulos">
                  {grupo.modules.map((m) => (
                    <NavLink
                      key={m.path}
                      to={m.path}
                      title={m.label}
                      className={({ isActive }) => "admin-nav-link" + (isActive ? " activo" : "")}
                    >
                      <span className="admin-nav-link-icono" aria-hidden="true">
                        {m.icon}
                      </span>
                      <span className="admin-nav-link-txt">{m.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
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

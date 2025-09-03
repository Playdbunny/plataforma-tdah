// AdminLayout.tsx
// Layout general del área de administración:
// - Sidebar con navegación (Dashboard, Ranking, Gestión...)
// - Topbar con búsqueda, notificaciones y usuario admin
// - <Outlet /> para renderizar las subrutas (/admin/dashboard, etc.)

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import styles from "./AdminLayout.module.css";
import { useAppStore } from "../../stores/appStore";
import { useMemo } from "react";

export default function AdminLayout() {
  // Hook para redirecciones (ej: al cerrar sesión)
  const navigate = useNavigate();

  // Obtenemos usuario y acción de logout desde el store global
  const user = useAppStore((s) => s.user);
  const logout = useAppStore((s) => s.logout);

  // Nombre mostrado en la esquina superior (fallback "Admin")
  const adminName = useMemo(() => user?.name ?? "Admin", [user]);

  // Manejador de cerrar sesión: limpia store y va a /login
  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className={styles.shell}>
      {/* ───────────────── Sidebar ───────────────── */}
      <aside className={styles.sidebar}>
        {/* Marca / logo del panel */}
        <div className={styles.brand}>
          <img src="/Images/Logo.png" alt="SynapQuest logo" className={styles.logoSlot} />
          <span>SynapQuest</span>
        </div>

        {/* Bloque “General” */}
        <div className={styles.sectionTitle}>General</div>
        <nav className={styles.nav}>
          {/* NavLink aplica clase .active automáticamente si la ruta está activa */}
          <NavLink
            to="/admin/dashboard"
            className={({ isActive }) =>
              isActive ? `${styles.item} ${styles.active}` : styles.item
            }
          >
            <span className={styles.icon} aria-hidden>
              🏠
            </span>
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/admin/ranking"
            className={({ isActive }) =>
              isActive ? `${styles.item} ${styles.active}` : styles.item
            }
          >
            <span className={styles.icon} aria-hidden>
              🏆
            </span>
            <span>Ranking</span>
          </NavLink>
        </nav>

        {/* Bloque “Gestión” */}
        <div className={styles.sectionTitle}>Gestión</div>
        <nav className={styles.nav}>
          <NavLink
            to="/admin/users"
            className={({ isActive }) =>
              isActive ? `${styles.item} ${styles.active}` : styles.item
            }
          >
            <span className={styles.icon} aria-hidden>
              👥
            </span>
            <span>Estudiantes</span>
          </NavLink>

          <NavLink
            to="/admin/Materias"
            className={({ isActive }) =>
              isActive ? `${styles.item} ${styles.active}` : styles.item
            }
          >
            <span className={styles.icon} aria-hidden>
              📚
            </span>
            <span>Materias</span>
          </NavLink>

          <NavLink
            to="/admin/materiales"
            className={({ isActive }) =>
              isActive ? `${styles.item} ${styles.active}` : styles.item
            }
          >
            <span className={styles.icon} aria-hidden>
              🗂️
            </span>
            <span>Materiales</span>
          </NavLink>
        </nav>

        {/* Botón “Cerrar sesión” al fondo del sidebar */}
        <button className={styles.logout} onClick={handleLogout}>
          Cerrar Sesión
        </button>
      </aside>

      {/* ───────────────── Contenido ───────────────── */}
      <div className={styles.content}>
        {/* Topbar con búsqueda + notificaciones + etiqueta Admin */}
        <header className={styles.topbar}>
          <div className={styles.searchWrap}>
            {/* input de búsqueda no funcional aún (lo conectas a futuro) */}
            <input
              className={styles.search}
              type="search"
              placeholder="Buscar..."
              aria-label="Buscar en panel"
            />
          </div>

          <div className={styles.topRight}>
            <button
              className={styles.bell}
              title="Notificaciones"
              aria-label="Notificaciones"
            >
              🔔
              {/* Badge con cantidad (hardcode 0 por ahora) */}
              <span className={styles.badge} aria-hidden>
                0
              </span>
            </button>

            {/* Etiqueta con nombre del admin */}
            <div className={styles.adminTag}>
              <span className={styles.adminDot} aria-hidden>
                🧑‍💼
              </span>
              <span>{adminName}</span>
            </div>
          </div>
        </header>

        {/* Aquí se renderean las páginas hijas del admin */}
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

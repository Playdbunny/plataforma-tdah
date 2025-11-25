// AdminLayout.tsx
// Layout general del área de administración:
// - Sidebar con navegación (Dashboard, Ranking, Gestión...)
// - Topbar con búsqueda, notificaciones y usuario admin
// - <Outlet /> para renderizar las subrutas (/admin/dashboard, etc.)

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import styles from "./AdminLayout.module.css";
import { useAppStore } from "../../stores/appStore";
import { useMemo, useEffect, useState } from "react";

export default function AdminLayout() {
  // Hook para redirecciones (ej: al cerrar sesión)
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Ajusta el color de fondo de <body> para que coincida con el área de administración.
  // Esto evita que se vea el color oscuro global cuando la ventana se reduce.
  useEffect(() => {
    const prevBg = document.body.style.background;
    document.body.style.background = "#dfe7ff";
    return () => {
      document.body.style.background = prevBg;
    };
  }, []);

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
      <aside
        className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}
        aria-hidden={!sidebarOpen && typeof window !== "undefined" && window.innerWidth < 960}
      >
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
            to="/admin/estudiantes"
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
            to="/admin/materias"
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
            to="/admin/actividades"
            className={({ isActive }) =>
              isActive ? `${styles.item} ${styles.active}` : styles.item
            }
          >
            <span className={styles.icon} aria-hidden>
              🎮
            </span>
            <span>Actividades</span>
          </NavLink>

        </nav>

        {/* Botón “Cerrar sesión” al fondo del sidebar */}
        <button className={styles.logout} onClick={handleLogout}>
          Cerrar Sesión
        </button>
      </aside>

      {sidebarOpen && <button className={styles.backdrop} onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú" />}

      {/* ───────────────── Contenido ───────────────── */}
      <div className={styles.content}>
        {/* Topbar con búsqueda + notificaciones + etiqueta Admin */}
        <header className={styles.topbar}>

          <button
            className={styles.menuBtn}
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Alternar menú"
            aria-expanded={sidebarOpen}
          >
            ☰
          </button>

          <div className={styles.topRight}>

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

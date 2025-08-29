// ─────────────────────────────────────────────────────────────
// Navbar.tsx (internal-only avatar & coins + DEV mock user)
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styles from "./Navbar.module.css";
import { useAppStore } from "../../stores/appStore";

export type NavItem = { label: string; to: string };

type NavbarProps = {
  homeOnly?: boolean;
  items?: NavItem[];
  avatarSrc?: string;
};

const SUBJECTS = [
  { id: "matematicas", name: "Matemática" },
  { id: "historia",    name: "Historia"   },
  { id: "quimica",     name: "Química"    },
];

const SUBJECT_PREFIX = "/subjects";

/* ============================================================
   DEV-ONLY MOCK (opción A)
   - Permite testear el dropdown completo sin login real.
   - Activo SOLO en desarrollo (import.meta.env.DEV).
   - Cómo usar:
       a) Click en el avatar sin sesión → inyecta MOCK_USER y abre menú
       b) Agregar ?mock=1 a la URL → inyecta MOCK_USER al cargar
   - Para desactivar: comenta el bloque "DEV-ONLY START/END".
   ============================================================ */
const DEV_ONLY = import.meta.env.DEV === true;
const MOCK_USER = {
  id: "dev-001",
  name: "Dev Tester",
  email: "dev@example.com",
  avatarUrl: "/avatar-default.png",
};
/* ======================= DEV-ONLY END ======================= */

export default function Navbar({
  homeOnly = false,
  items = [],
  avatarSrc = "/default-profile.jpg",
}: NavbarProps) {
  const [openUser, setOpenUser] = useState(false);
  const [openSubjects, setOpenSubjects] = useState(false);

  const userRef = useRef<HTMLDivElement | null>(null);
  const subjectsRef = useRef<HTMLDivElement | null>(null);

  const navigate = useNavigate();
  const { pathname } = useLocation();

  // ──────────────────────────────────────────────────────────
  // Store selectors (con cast a any para evitar error TS2339)
  // Nota: si luego tipas tu AppState con auth/wallet, puedes
  // remover los "as any" y usar las props tipadas.
  // ──────────────────────────────────────────────────────────
  const user = useAppStore((s: any) => s?.auth?.user ?? s?.user ?? null);
  const coins = useAppStore((s: any) => s?.wallet?.coins ?? s?.points ?? 0);
  const setUser = useAppStore((s: any) => s?.setUser ?? (() => {}));

  const showMenu = !homeOnly;

  // Rutas públicas donde NO se muestran avatar/monedas
  const isPublic = useMemo(
    () => /^\/($|login(\/|$)|register(\/|$)|forgot(\/|$)|reset(\/|$))/.test(pathname),
    [pathname]
  );

  // ¿Estás dentro de /subjects/* ?
  const isOnSubjectPage = pathname.startsWith(SUBJECT_PREFIX);

  // Cierra menús al hacer click fuera
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (userRef.current && !userRef.current.contains(t)) setOpenUser(false);
      if (subjectsRef.current && !subjectsRef.current.contains(t)) setOpenSubjects(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  /* ======================= DEV-ONLY START =======================
     Inyecta usuario mock automáticamente si entras con ?mock=1
     (Solo en desarrollo)
  =============================================================== */
  useEffect(() => {
    if (!DEV_ONLY) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("mock") === "1" && !user) {
      (setUser as any)(MOCK_USER);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [DEV_ONLY]);
  /* ======================== DEV-ONLY END ======================== */

  // Monedas a mostrar (si no hay, en dev muestra 999 para test)
  const displayCoins = useMemo(
    () => (coins && Number.isFinite(coins) ? coins : (DEV_ONLY ? 999 : 0)),
    [coins]
  );

  return (
    <header className={styles.navbar} role="banner">
      <div className={styles.inner}>
        {/* Marca */}
        <Link to="/" className={styles.brand} aria-label="Ir al inicio">
          <img src="/Logo.png" alt="SynapQuest logo" className={styles.logoSlot} />
          <span className={styles.brandText}>SynapQuest</span>
        </Link>

        {/* Menú derecho */}
        {showMenu && (
          <div className={styles.right}>
            <nav className={styles.menu} aria-label="Navegación principal">
              {items.map((it) => {
                const isMaterias =
                  it.label.toLowerCase() === "materias" || it.to === "/subjects";

                if (!isMaterias || !isOnSubjectPage) {
                  return (
                    <Link key={it.to} to={it.to}>
                      {it.label}
                    </Link>
                  );
                }

                // "Materias" como trigger solo dentro de /subjects/*
                return (
                  <div
                    key="materias-trigger"
                    className={styles.subjectsItem}
                    ref={subjectsRef}
                  >
                    <Link
                      to="/subjects"
                      className={styles.subjectsTrigger}
                      aria-haspopup="menu"
                      aria-expanded={openSubjects}
                      onClick={(e) => {
                        if (!e.ctrlKey && !e.metaKey && e.button === 0) {
                          e.preventDefault();
                          setOpenSubjects((v) => !v);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setOpenSubjects(false);
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setOpenSubjects((v) => !v);
                        }
                      }}
                    >
                      Materias ▾
                    </Link>

                    {openSubjects && (
                      <ul
                        className={styles.dropList}
                        role="menu"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {SUBJECTS.map((s) => {
                          const href = `${SUBJECT_PREFIX}/${s.id}`;
                          const isActive = pathname.startsWith(href);
                          return (
                            <li key={s.id} role="none">
                              <Link
                                role="menuitem"
                                to={href}
                                className={`${styles.dropLink} ${isActive ? styles.active : ""}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  setOpenSubjects(false);
                                  navigate(href);
                                }}
                              >
                                {s.name}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* Monedas: visibles solo en páginas internas */}
            {!isPublic && (
              <div className={styles.coins} title="Tus monedas">
                <span className={styles.coinIcon}>🪙</span>
                <span className={styles.coinValue}>{displayCoins}</span>
              </div>
            )}

            {/* Avatar + dropdown: visible solo en páginas internas */}
            {!isPublic && (
              <div className={styles.user} ref={userRef}>
                <button
                  type="button"
                  className={styles.userBtn}
                  onClick={(e) => {
                    /* ======================= DEV-ONLY START =======================
                       Alt + click en avatar → inyecta MOCK_USER y abre menú
                       Click normal:
                         - si ya hay user: toggle
                         - si no hay user: (en dev) inyecta y abre / (en prod) solo toggle
                    =============================================================== */
                    if (DEV_ONLY && !user && (e as any).altKey) {
                      (setUser as any)(MOCK_USER);
                      setOpenUser(true);
                      return;
                    }
                    if (DEV_ONLY && !user) {
                      (setUser as any)(MOCK_USER);
                      setOpenUser(true);
                      return;
                    }
                    /* ======================== DEV-ONLY END ======================== */
                    setOpenUser((v) => !v);
                  }}
                  aria-haspopup="menu"
                  aria-expanded={openUser}
                >
                  <img
                    src={(user as any)?.avatarUrl ?? avatarSrc}
                    alt="Avatar usuario"
                    className={styles.avatarImg}
                  />
                </button>

                {openUser && (
                  <div role="menu" className={styles.userMenu}>
                    {user ? (
                      <>
                        <Link to="/profile" role="menuitem" className={styles.userItem}>Perfil</Link>
                        <Link to="/settings" role="menuitem" className={styles.userItem}>Configuración</Link>
                        <div className={styles.sep} />
                        <button
                          role="menuitem"
                          className={`${styles.userItem} ${styles.danger}`}
                          onClick={() => setUser(null)}
                        >
                          Cerrar sesión
                        </button>
                      </>
                    ) : (
                      <Link to="/login" role="menuitem" className={styles.userItem}>
                        Iniciar sesión
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

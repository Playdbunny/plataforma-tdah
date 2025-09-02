// ─────────────────────────────────────────────────────────────
// Navbar.tsx (internal-only avatar & coins + DEV mock user)
// ─────────────────────────────────────────────────────────────
import CoinsBadge from "../CoinsBadge/CoinsBadge"; // ✅ usando el componente
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
   ============================================================ */
const DEV_ONLY = import.meta.env.DEV === true;
const MOCK_USER = {
  id: "dev-001",
  name: "Dev Tester",
  email: "dev@example.com",
  avatarUrl: "/Images/default-profile.jpg",
  role: "admin" as const,
  xp: 1000,
};
/* ======================= DEV-ONLY END ======================= */

// Fallback seguro (asegúrate que exista en /public)
const FALLBACK_AVATAR = "/Images/default-profile.jpg";

export default function Navbar({
  homeOnly = false,
  items = [],
  avatarSrc = "/Images/default-profile.jpg",
}: NavbarProps) {
  const [openUser, setOpenUser] = useState(false);
  const [openSubjects, setOpenSubjects] = useState(false);

  const userRef = useRef<HTMLDivElement | null>(null);
  const subjectsRef = useRef<HTMLDivElement | null>(null);

  const navigate = useNavigate();
  const { pathname } = useLocation();

  const user  = useAppStore((s:any) => s?.user ?? null);
  const setUser = useAppStore((s: any) => s?.setUser ?? (() => {}));

  const showMenu = !homeOnly;

  const isPublic = useMemo(
    () => /^\/($|login(\/|$)|register(\/|$)|forgot(\/|$)|reset(\/|$))/.test(pathname),
    [pathname]
  );

  // Guard visual: si el perfil está incompleto, restringimos los ítems del menú
  const mustSetup = !!user && (!user.username || !user.character);
  const effectiveItems = useMemo<NavItem[]>(
    () => (mustSetup ? [{ label: "Perfil", to: "/profile/edit" }] : items),
    [mustSetup, items]
  );

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (userRef.current && !userRef.current.contains(t)) setOpenUser(false);
      if (subjectsRef.current && !subjectsRef.current.contains(t)) setOpenSubjects(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // Inyección mock con ?mock=1
  useEffect(() => {
    if (!DEV_ONLY) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("mock") === "1" && !user) {
      (setUser as any)(MOCK_USER);
    }
  }, [DEV_ONLY, user, setUser]);

  return (
    <header className={styles.navbar} role="banner">
      <div className={styles.inner}>
        {/* Marca */}
        <Link to="/" className={styles.brand} aria-label="Ir al inicio">
          <img src="/Images/Logo.png" alt="SynapQuest logo" className={styles.logoSlot} />
          <span className={styles.brandText}>SynapQuest</span>
        </Link>

        {/* Menú derecho */}
        {showMenu && (
          <div className={styles.right}>
            <nav className={styles.menu} aria-label="Navegación principal">
              {effectiveItems.map((it) => {
                const isMaterias =
                  it.label.toLowerCase() === "materias" || it.to === "/subjects";

                // Si estamos en modo "perfil incompleto", no mostramos dropdown de Materias
                if (mustSetup || !isMaterias) {
                  return (
                    <Link key={it.to} to={it.to}>
                      {it.label}
                    </Link>
                  );
                }

                // Materias como trigger con dropdown
                return (
                  <div key="materias-trigger" className={styles.subjectsItem} ref={subjectsRef}>
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
                        {/* ───── Opción: Ver todas las materias ───── */}
                          <li role="none">
                            <Link
                              role="menuitem"
                              to="/courses"
                              className={`${styles.dropLink} ${styles.dropAll}`}
                              onClick={(e) => {
                                e.preventDefault();
                                setOpenSubjects(false);
                                navigate("/courses");
                              }}
                            >
                              Ver todas
                            </Link>
                          </li>
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

            {/* 👇 Coins globales: ahora con componente */}
            {!isPublic && (
              <CoinsBadge
                compact
                // onClick={() => navigate("/shop")} // descomenta si quieres que abra tienda
              />
            )}

            {!isPublic && (
              <div className={styles.user} ref={userRef}>
                <button
                  type="button"
                  className={styles.userBtn}
                  onClick={(e) => {
                    if (DEV_ONLY && !user) {
                      (setUser as any)(MOCK_USER);
                      setOpenUser(true);
                      return;
                    }
                    setOpenUser((v) => !v);
                  }}
                  aria-haspopup="menu"
                  aria-expanded={openUser}
                >
                  <img
                    src={(user as any)?.avatarUrl || avatarSrc || FALLBACK_AVATAR}
                    alt="Avatar usuario"
                    className={styles.avatarImg}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const t = e.currentTarget as HTMLImageElement;
                      if (!t.dataset.fbk) {
                        t.dataset.fbk = "1";
                        t.src = FALLBACK_AVATAR;
                      }
                    }}
                  />
                </button>

                {openUser && (
                  <div role="menu" className={styles.userMenu}>
                    {user ? (
                      <>
                        <Link to="/profile" role="menuitem" className={styles.userItem}>Perfil</Link>
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

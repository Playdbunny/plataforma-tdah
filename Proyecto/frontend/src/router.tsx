// ─────────────────────────────────────────────────────────────
// router.tsx — Define TODAS las rutas con createBrowserRouter
// ─────────────────────────────────────────────────────────────

import { createBrowserRouter, Navigate } from "react-router-dom";
import { ReactNode } from "react"; // Tipamos children como ReactNode

// Store (para leer el usuario, su rol y el flag de hidratación)
import { useAppStore } from "./stores/appStore";

// Páginas públicas
import Home from "./Pages/Home/Home";
import Login from "./Pages/Login/Login";
import Register from "./Pages/Register/Register";
import Forgot from "./Pages/Forgot/Forgot";
import Reset from "./Pages/Reset/Reset";
import TdahSelect from "./Pages/TDAHSelect/TDAHSelect";
import SubjectPage from "./Pages/SubjectPage/SubjectPage";

// Páginas autenticadas
import Courses from "./Pages/Courses/Courses";
import Profile from "./Pages/Profile/Profile";
import EditProfile from "./Pages/Profile/EditProfile";
import ProtectedLayout from "./Layouts/ProtectedLayout";

// Admin (layout + páginas)
import AdminLayout from "./Layouts/AdminLayout/AdminLayout";
import AdminDashboard from "./Pages/Admin/General/Dashboard";
import AdminRanking from "./Pages/Admin/General/Ranking";
import MateriasPage from "./Pages/Admin/Gestion/Materias";
import MaterialesPage from "./Pages/Admin/Gestion/Materiales";

import EstudiantesPage from "./Pages/Admin/Gestion/EstudiantesPage";
import EstudianteDetallePage from "./Pages/Admin/Gestion/EstudianteDetallePage";


// ─────────────────────────────────────────────────────────────
// Guard de ADMIN — espera hidratación y valida role === 'admin'
// ─────────────────────────────────────────────────────────────
type GuardProps = { children: ReactNode };

function RequireAdmin({ children }: GuardProps) {
  // ⬇️ NUEVO: leemos el flag 'hydrated' para no redirigir antes de tiempo
  const hydrated = useAppStore((s) => s.hydrated);
  const user = useAppStore((s) => s.user);

  // Mientras no se hidrate el store, aún no sabemos si hay sesión → no redirigimos.
  // Puedes renderizar un loader si prefieres.
  //if (!hydrated) return null;
  if (!hydrated) return <div className="loading-container">Cargando…</div>;


  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}

// ─────────────────────────────────────────────────────────────
// Definición de rutas (árbol) con createBrowserRouter
// ─────────────────────────────────────────────────────────────
export const router = createBrowserRouter([
  // ── Públicas (no requieren login) ──────────────────────────
  { path: "/", element: <Home /> },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  { path: "/forgot", element: <Forgot /> },
  { path: "/reset", element: <Reset /> },
  { path: "/reset/:token", element: <Reset /> },

  // Flujo inicial (selección TDAH)
  { path: "/tdah", element: <TdahSelect /> },

  // Ruta dinámica de materias pública (si la quieres protegida, muévela más abajo)
  { path: "/subjects/:subjectId", element: <SubjectPage /> },

  // ── Autenticadas (requieren login) ─────────────────────────
  // Todo lo que vaya dentro de ProtectedLayout exige sesión (tu ProtectedLayout ya hace el guard).
  {
    element: <ProtectedLayout />,
    children: [
      { path: "/profile", element: <Profile /> },
      { path: "/profile/edit", element: <EditProfile /> },
      { path: "/courses", element: <Courses /> },

      // 👉 Si en vez de pública quieres proteger SubjectPage,
      // comenta la versión pública de arriba y descomenta esta:
      // { path: "/subjects/:subjectId", element: <SubjectPage /> },
    ],
  },

  // ── Admin-only (requiere role === 'admin') ─────────────────
  // Envuelve AdminLayout con RequireAdmin; sus hijos se rinden en <Outlet />
  {
    path: "/admin",
    element: (
      <RequireAdmin>
        <AdminLayout />
      </RequireAdmin>
    ),
    children: [
      // /admin → redirige a /admin/dashboard
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },

      // Páginas del panel
      { path: "dashboard", element: <AdminDashboard /> },
      { path: "ranking", element: <AdminRanking /> },
      { path: "materias", element: <MateriasPage /> },

      { path: "materiales", element: <MaterialesPage />},

      { path: "estudiantes", element: <EstudiantesPage /> },
      { path: "gestion/estudiantes/:id", element: <EstudianteDetallePage /> },



      // Agrega aquí más secciones cuando las tengas listas:
      // { path: "users", element: <AdminUsers /> },
      // { path: "materials", element: <AdminMaterials /> },
      // { path: "ranking", element: <AdminRanking /> },
    ],
  },

  // ── (Opcional) 404 Not Found ───────────────────────────────
  // { path: "*", element: <NotFound /> },
]);

/* ─────────────────────────────────────────────────────────────
   Notas:
   - Este guard depende de que appStore tenga 'hydrated' funcionando
     (onRehydrateStorage en el persist); ya lo añadimos en appStore.ts.
   - Si quieres mostrar algo mientras !hydrated, reemplaza 'return null'
     por tu componente <Spinner/> o un placeholder.
   - Si aún te manda al login, revisa en consola:
       JSON.parse(localStorage.getItem("synapquest-store") || "null")
     que exista 'state.user.role === "admin"' y que 'version' sea 4.
   ───────────────────────────────────────────────────────────── */

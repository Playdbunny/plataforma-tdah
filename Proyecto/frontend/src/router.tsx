import NotFound from "./Pages/NotFound";
import ErrorPage from "./Pages/ErrorPage";
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
import ActivityPage from "./Pages/Activity/ActivityPage";
import ActivityResultPage from "./Pages/Activity/Result/ActivityResultPage";
import GoogleCallback from "./Pages/OAuth/GoogleCallback";

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
import ActividadesPage from "./Pages/Admin/Gestion/Actividades";
import SubjectActivitiesAdminPage from "./Pages/Admin/Gestion/SubjectActivities";

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

  // Si no hay usuario o no es admin, redirige fuera del admin
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}

const commonErrorElement = <ErrorPage />;

// ─────────────────────────────────────────────────────────────
// Definición de rutas (árbol) con createBrowserRouter
// ─────────────────────────────────────────────────────────────
export const router = createBrowserRouter([
  // ── Públicas (no requieren login) ──────────────────────────
  { path: "/", element: <Home />, errorElement: commonErrorElement },
  { path: "/login", element: <Login />, errorElement: commonErrorElement },
  { path: "/register", element: <Register />, errorElement: commonErrorElement },
  { path: "/forgot", element: <Forgot />, errorElement: commonErrorElement },
  { path: "/reset", element: <Reset />, errorElement: commonErrorElement },
  { path: "/reset/:token", element: <Reset />, errorElement: commonErrorElement },
  { path: "/oauth/google/callback", element: <GoogleCallback />, errorElement: commonErrorElement },

  // Flujo inicial (selección TDAH)
  { path: "/tdah", element: <TdahSelect /> },

  // ── Autenticadas (requieren login) ─────────────────────────
  // Todo lo que vaya dentro de ProtectedLayout exige sesión (tu ProtectedLayout ya hace el guard).
  {
    element: <ProtectedLayout />,
    errorElement: commonErrorElement,
    children: [
      { path: "/profile", element: <Profile /> },
      { path: "/profile/edit", element: <EditProfile /> },
      { path: "/courses", element: <Courses /> },

      // Materias y actividades (privadas)
      {
        path: "/subjects/:subjectId/activities/:activitySlug/result",
        element: <ActivityResultPage />,
      },
      { path: "/subjects/:subjectId/activities/:activitySlug", element: <ActivityPage /> },
      { path: "/subjects/:subjectId", element: <SubjectPage /> },
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
      { path: "dashboard", element: <AdminDashboard />, errorElement: commonErrorElement },
      { path: "ranking", element: <AdminRanking />, errorElement: commonErrorElement },
      { path: "materias", element: <MateriasPage />, errorElement: commonErrorElement },
      { path: "actividades", element: <ActividadesPage />, errorElement: commonErrorElement },
      { path: "actividades/:subjectId", element: <SubjectActivitiesAdminPage />, errorElement: commonErrorElement },
      { path: "estudiantes", element: <EstudiantesPage />, errorElement: commonErrorElement },
      { path: "gestion/estudiantes/:id", element: <EstudianteDetallePage />, errorElement: commonErrorElement },


      // Agrega aquí más secciones cuando las tengas listas:
      // { path: "users", element: <AdminUsers /> },
      // { path: "materials", element: <AdminMaterials /> },
      // { path: "ranking", element: <AdminRanking /> },
    ],
  },

  // ── 404 Not Found ───────────────────────────────
  { path: "*", element: <NotFound />, errorElement: commonErrorElement },
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

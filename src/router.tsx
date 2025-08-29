// ─────────────────────────────────────────────────────────────
// router.tsx — Define TODAS las rutas con createBrowserRouter
// ─────────────────────────────────────────────────────────────
import { createBrowserRouter } from "react-router-dom";

import Home from "./Pages/Home/Home";
import Login from "./Pages/Login/Login";
import Register from "./Pages/Register/Register";
import Forgot from "./Pages/Forgot/Forgot";
import Reset from "./Pages/Reset/Reset";
import TdahSelect from "./Pages/TDAHSelect/TDAHSelect";
import Courses from "./Pages/Courses/Courses";
import AvatarSelect from "./Pages/AvatarSelect/AvatarSelect";
import SubjectPage from "./Pages/SubjectPage/SubjectPage"; // 👈 AÑADIDO

export const router = createBrowserRouter([
  // Públicas
  { path: "/", element: <Home /> },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  { path: "/forgot", element: <Forgot /> },
  { path: "/reset", element: <Reset /> },
  { path: "/reset/:token", element: <Reset /> },

  // Flujos
  { path: "/tdah", element: <TdahSelect /> },
  { path: "/avatar", element: <AvatarSelect /> },

  // Cursos
  { path: "/courses", element: <Courses /> },

  // ⭐ Ruta DINÁMICA de materias
  //    /subjects/historia   /subjects/quimica   /subjects/matematicas
  { path: "/subjects/:subjectId", element: <SubjectPage /> },

  // (Opcional) 404
  // { path: "*", element: <NotFound /> },
]);

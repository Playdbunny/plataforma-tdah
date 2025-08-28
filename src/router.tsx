import { createBrowserRouter } from "react-router-dom";
import Home from "./Pages/Home/Home";
import TdahSelect from "./Pages/TDAHSelect/TDAHSelect";
import Login from "./Pages/Login/Login";
import Register from "./Pages/Register/Register";
import Forgot from "./Pages/Forgot/Forgot";
import Reset from "./Pages/Reset/Reset";
import Courses from "./Pages/Courses/Courses";
import AvatarSelect from "./Pages/AvatarSelect/AvatarSelect";

export const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  { path: "/tdah", element: <TdahSelect /> },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  { path: "/avatar", element: <AvatarSelect /> },
  { path: "/forgot", element: <Forgot /> },
  { path: "/reset", element: <Reset /> },
  { path: "/reset/:token", element: <Reset /> },
  { path: "/courses", element: <Courses /> },
]);

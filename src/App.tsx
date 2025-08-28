import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./Pages/Home/Home";
import Login from "./Pages/Login/Login";
import Register from "./Pages/Register/Register";
import Forgot from "./Pages/Forgot/Forgot";
import Reset from "./Pages/Reset/Reset";
import TdahSelect from "./Pages/TDAHSelect/TDAHSelect";
import Courses from "./Pages/Courses/Courses";
import AvatarSelect from "./Pages/AvatarSelect/AvatarSelect";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Páginas públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/avatar" element={<AvatarSelect />} />

        {/* Flujo de recuperación */}
        <Route path="/forgot" element={<Forgot />} />
        <Route path="/reset" element={<Reset />} />

        {/* Selección de TDAH */}
        <Route path="/tdah" element={<TdahSelect />} />

        {/* Cursos */}
        <Route path="/courses" element={<Courses />} />

        {/* Si quieres, un catch-all para rutas inexistentes */}
        {/* <Route path="*" element={<NotFound />} /> */}
      </Routes>
    </BrowserRouter>
  );
}

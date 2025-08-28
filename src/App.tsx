<<<<<<< Updated upstream
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./Pages/Home";
import TDAHSelection from "./Pages/TDAHSelection";
import Register from './Pages/Register';
=======
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./Pages/Home/Home";
import Login from "./Pages/Login/Login";
import Register from "./Pages/Register/Register";
import AvatarSelect from "./Pages/AvatarSelect/AvatarSelect";
import Forgot from "./Pages/Forgot/Forgot";
import Reset from "./Pages/Reset/Reset";
import TdahSelect from "./Pages/TDAHSelect/TDAHSelect";
import Courses from "./Pages/Courses/Courses";
>>>>>>> Stashed changes

 // si tienes una página específica para el modelo atómico
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Páginas públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/tdah-selection" element={<TDAHSelection />} />
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




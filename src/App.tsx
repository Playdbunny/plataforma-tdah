import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./Pages/Home";
import Login from "./Pages/Login";
import Register from "./Pages/Register"; // si ya tienes la página de crear cuenta
import Subjects from "./Pages/Subjects";
import MathPage from "./Pages/Math";
import HistoryPage from "./Pages/History";
import ChemistryPage from "./Pages/Chemistry";
 // si tienes una página específica para el modelo atómico
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} /> {/* opcional */}
        <Route path="/subjects" element={<Subjects />} />
        <Route path="/subjects/math" element={<MathPage />} />
        <Route path="/subjects/history" element={<HistoryPage />} />
        <Route path="/subjects/chemistry" element={<ChemistryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}




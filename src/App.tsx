import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Subjects from "./pages/Subjects";
import MathPage from "./pages/MathPage";
import HistoryPage from "./pages/HistoryPage";
import ChemistryPage from "./pages/ChemistryPage";
import Auth from "./pages/Auth";
 // si tienes una página específica para el modelo atómico
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/subjects" element={<Subjects />} />
        <Route path="/subjects/math" element={<MathPage />} />
        <Route path="/subjects/history" element={<HistoryPage />} />
        <Route path="/subjects/chemistry" element={<ChemistryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}




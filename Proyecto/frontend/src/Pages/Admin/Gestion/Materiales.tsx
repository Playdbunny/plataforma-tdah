import React, { useState } from "react";
import styles from "./Materiales.module.css";

const materialesEjemplo = [
  {
    titulo: "Guía Álgebra",
    materia: "Matemáticas",
    tipo: "PDF",
    orientado: "Tipo TDAH",
    subidoPor: "Admin",
    fecha: "01/09/25",
  },
  {
    titulo: "Video Independencia",
    materia: "Historia",
    tipo: "Video",
    orientado: "Tipo TDAH",
    subidoPor: "Admin",
    fecha: "30/06/25",
  },
  {
    titulo: "Experimentos básicos",
    materia: "Química",
    tipo: "Link",
    orientado: "Tipo TDAH",
    subidoPor: "Admin",
    fecha: "28/06/25",
  },
];

export default function MaterialesPage() {
  const [busqueda, setBusqueda] = useState("");
  const [materiaFiltro, setMateriaFiltro] = useState("");
  const [pagina, setPagina] = useState(1);

  // Filtrado simple
  const materialesFiltrados = materialesEjemplo.filter(
    (m) =>
      m.titulo.toLowerCase().includes(busqueda.toLowerCase()) &&
      (materiaFiltro ? m.materia === materiaFiltro : true)
  );

  return (
    <div className={styles.materialesContainer}>
      <h1 className={styles.titulo}>Materiales📂</h1>
      <div className={styles.filtros}>
        <input
          type="text"
          placeholder="Buscar materiales…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className={styles.busqueda}
        />
        <label htmlFor="materia-select" className={styles.visuallyHidden}>
          Filtrar por materia
        </label>
        <select
          id="materia-select"
          aria-label="Filtrar por materia"
          value={materiaFiltro}
          onChange={(e) => setMateriaFiltro(e.target.value)}
          className={styles.filtroMateria}
        >
          <option value="">Filtrar por materia</option>
          <option value="Matemáticas">Matemáticas</option>
          <option value="Historia">Historia</option>
          <option value="Química">Química</option>
        </select>
        <button className={styles.nuevoBtn}>+ Nuevo</button>
      </div>
      <table className={styles.tabla}>
        <thead>
          <tr>
            <th>Título</th>
            <th>Materia</th>
            <th>Tipo</th>
            <th>Orientado</th>
            <th>Subido por</th>
            <th>Fecha</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {materialesFiltrados.map((m, i) => (
            <tr key={i}>
              <td>{m.titulo}</td>
              <td>{m.materia}</td>
              <td>{m.tipo}</td>
              <td>{m.orientado}</td>
              <td>{m.subidoPor}</td>
              <td>{m.fecha}</td>
              <td>
                <button title="Ver">👁️</button>
                <button title="Editar">✏️</button>
                <button title="Eliminar">🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={styles.paginacion}>
        <button
          onClick={() => setPagina((p) => Math.max(1, p - 1))}
          disabled={pagina === 1}
        >
          Anterior
        </button>
        <span>
          Página <b>{pagina}</b> de <b>5</b>
        </span>
        <button
          onClick={() => setPagina((p) => Math.min(5, p + 1))}
          disabled={pagina === 5}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
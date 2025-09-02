// Ranking.tsx
// Página de Ranking de estudiantes con:
// - Búsqueda por nombre
// - Ordenamiento por columnas (posición, nombre, xp, progreso, última actividad)
// - Paginación
// - Estilos accesibles y responsivos

import { useMemo, useState } from "react";
import styles from "./Ranking.module.css";

// ====================
// Tipo de datos Student
// ====================
type Student = {
  id: string;
  name: string;
  xp: number;            // XP total acumulado
  progress: number;      // % progreso (0..100)
  lastActiveHours: number; // horas desde última actividad (ej: "hace 2h")
};

// ====================
// Datos MOCK (ejemplo)
// ====================
// ⚠️ En el futuro esto vendrá desde el backend.
const MOCK_STUDENTS: Student[] = [
  { id: "1", name: "Ana Torres", xp: 850, progress: 90, lastActiveHours: 2 },
  { id: "2", name: "Juan Pérez", xp: 800, progress: 85, lastActiveHours: 3 },
  { id: "3", name: "Pedro Rojas", xp: 650, progress: 70, lastActiveHours: 6 },
  { id: "4", name: "Valentina Díaz", xp: 620, progress: 75, lastActiveHours: 1 },
  { id: "5", name: "Camila Soto", xp: 580, progress: 60, lastActiveHours: 9 },
  { id: "6", name: "Ignacio Mora", xp: 545, progress: 58, lastActiveHours: 4 },
  { id: "7", name: "Felipe Reyes", xp: 530, progress: 57, lastActiveHours: 11 },
  { id: "8", name: "Sofía Álvarez", xp: 520, progress: 65, lastActiveHours: 7 },
  { id: "9", name: "Martín Silva", xp: 505, progress: 62, lastActiveHours: 5 },
  { id: "10", name: "Luisa Godoy", xp: 480, progress: 55, lastActiveHours: 10 },
  { id: "11", name: "Franco Constanzo", xp: 440, progress: 42, lastActiveHours: 10 },
];

// ====================
// Tipos para ordenar
// ====================
type SortKey = "position" | "name" | "xp" | "progress" | "lastActive";
type SortDir = "asc" | "desc";

// Formateador de números con separador de miles
const nf = new Intl.NumberFormat("es-CL");

export default function AdminRanking() {
  // ============
  // Estado de UI
  // ============
  const [query, setQuery] = useState(""); // búsqueda
  const [page, setPage] = useState(1);    // página actual
  const [pageSize, setPageSize] = useState(10); // filas por página
  const [sortKey, setSortKey] = useState<SortKey>("xp"); // columna activa
  const [sortDir, setSortDir] = useState<SortDir>("desc"); // dirección de orden

  // En un futuro → fetch desde backend
  const all = MOCK_STUDENTS;

  // ======================
  // 1. Filtrado por nombre
  // ======================
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((s) => s.name.toLowerCase().includes(q));
  }, [all, query]);

  // ======================
  // 2. Ordenamiento
  // ======================
  const sorted = useMemo(() => {
    const arr = [...filtered];

    // Calculamos la "posición real" = orden XP desc
    const rankingOrder = [...arr].sort((a, b) => b.xp - a.xp);
    const idToPosition = new Map<string, number>();
    rankingOrder.forEach((s, i) => idToPosition.set(s.id, i + 1));

    // Orden según columna elegida
    arr.sort((a, b) => {
      const posA = idToPosition.get(a.id)!;
      const posB = idToPosition.get(b.id)!;
      let cmp = 0;

      if (sortKey === "position") cmp = posA - posB;
      else if (sortKey === "name") cmp = a.name.localeCompare(b.name, "es");
      else if (sortKey === "xp") cmp = a.xp - b.xp;
      else if (sortKey === "progress") cmp = a.progress - b.progress;
      else if (sortKey === "lastActive") cmp = a.lastActiveHours - b.lastActiveHours;

      return sortDir === "asc" ? cmp : -cmp;
    });

    // Devolvemos la lista con posición adjunta
    return arr.map((s) => ({ ...s, position: idToPosition.get(s.id)! }));
  }, [filtered, sortKey, sortDir]);

  // ======================
  // 3. Paginación
  // ======================
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageItems = sorted.slice(start, start + pageSize);

  // ======================
  // Helpers UI
  // ======================
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      // Si clicas la misma columna → alterna asc/desc
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      // Si cambias de columna → default: asc para texto, desc para números
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  // Medallas para top 3
  const medal = (position: number) =>
    position === 1 ? "🥇" : position === 2 ? "🥈" : position === 3 ? "🥉" : "";

  // ======================
  // Render
  // ======================
  return (
    <div className={styles.screen}>
      {/* Header con título y acciones */}
      <header className={styles.header}>
        <div className={styles.title}>
          <span role="img" aria-label="Trofeo">🏅</span>&nbsp; Ranking de Estudiantes
        </div>

        <div className={styles.actions}>
          {/* Buscador */}
          <input
            className={styles.search}
            placeholder="Buscar estudiante…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            aria-label="Buscar estudiante"
          />
          {/* Selector de tamaño de página */}
          <select
            className={styles.pageSize}
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            aria-label="Tamaño de página"
          >
            {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}/pág</option>)}
          </select>
        </div>
      </header>

      {/* Tabla principal */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {/* Encabezados clickeables para ordenar */}
              <Th active={sortKey==="position"} dir={sortDir} onClick={()=>toggleSort("position")} label="Posición" />
              <Th active={sortKey==="name"}     dir={sortDir} onClick={()=>toggleSort("name")}     label="Estudiante" />
              <Th active={sortKey==="xp"}       dir={sortDir} onClick={()=>toggleSort("xp")}       label="XP" />
              <Th active={sortKey==="progress"} dir={sortDir} onClick={()=>toggleSort("progress")} label="% Progreso" />
              <Th active={sortKey==="lastActive"} dir={sortDir} onClick={()=>toggleSort("lastActive")} label="Última Actividad" />
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              // Caso sin resultados
              <tr><td className={styles.empty} colSpan={5}>Sin resultados</td></tr>
            ) : pageItems.map((s) => (
              <tr key={s.id}>
                <td className={styles.pos}>
                  {/* Medalla si aplica */}
                  <span className={styles.medal} aria-hidden>{medal((s as any).position)}</span>
                  {(s as any).position}
                </td>
                <td className={styles.name}>{s.name}</td>
                <td className={styles.xp}>{nf.format(s.xp)} XP</td>
                <td className={styles.progress}>
                  <div className={styles.bar}>
                    <div className={styles.fill} style={{ width: `${s.progress}%` }} />
                  </div>
                  <span className={styles.pct}>{s.progress}%</span>
                </td>
                <td className={styles.last}>hace {s.lastActiveHours}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginador */}
      <footer className={styles.pager}>
        <button
          className={styles.btn}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          ◀ Anterior
        </button>
        <span className={styles.pageInfo}>
          Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
        </span>
        <button
          className={styles.btn}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
        >
          Siguiente ▶
        </button>
      </footer>
    </div>
  );
}

// ======================
// Componente auxiliar <Th>
// ======================
// Encabezado de columna clickeable para ordenar
function Th({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <th>
      <button
        className={`${styles.thBtn} ${active ? styles.active : ""}`}
        onClick={onClick}
        aria-pressed={active}
        aria-label={`Ordenar por ${label} (${active ? (dir === "asc" ? "ascendente" : "descendente") : "sin ordenar"})`}
        title="Ordenar"
      >
        {label}
        {active && <span className={styles.caret}>{dir === "asc" ? "▲" : "▼"}</span>}
      </button>
    </th>
  );
}

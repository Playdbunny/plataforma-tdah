// Ranking.tsx
// Página de Ranking de estudiantes con datos reales desde el backend.
// - Búsqueda por nombre
// - Ordenamiento por columnas (posición, nombre, xp, progreso, última actividad)
// - Paginación
// - Estilos accesibles y responsivos

import { useEffect, useMemo, useState } from "react";
import { useBackendReady } from "@/Hooks";
import styles from "./Ranking.module.css";
import { useStudentsStore } from "../../../stores/studentsStore";
import { timeAgo } from "../../../utils/timeAgo";
import { currentTotalXP } from "../../../lib/Levels";

// ====================
// Tipos para ordenar
// ====================
type SortKey = "position" | "name" | "xp" | "lastActive";
type SortDir = "asc" | "desc";

// Formateador de números con separador de miles
const nf = new Intl.NumberFormat("es-CL");

export default function AdminRanking() {
  const ready = useBackendReady();
  // Estado global de estudiantes
  const { items, list, loading, error } = useStudentsStore();

  // ============
  // Estado de UI
  // ============
  const [query, setQuery] = useState(""); // búsqueda
  const [page, setPage] = useState(1); // página actual
  const [pageSize, setPageSize] = useState(10); // filas por página
  const [sortKey, setSortKey] = useState<SortKey>("xp"); // columna activa
  const [sortDir, setSortDir] = useState<SortDir>("desc"); // dirección de orden

  useEffect(() => {
    if (!ready) return;
    if (!items.length) {
      void list();
    }
  }, [items.length, list, ready]);

  type DerivedStudent = {
    id: string;
    name: string;
    totalXp: number;
    lastActiveIso: string | null;
    lastActiveHours: number | null;
  };

  const all = useMemo<DerivedStudent[]>(() => {
    return items.map((student) => {
      const lastIso = student.lastActivityAt ?? student.lastLogin ?? null;
      const lastHours = lastIso
        ? Math.max(0, Math.floor((Date.now() - new Date(lastIso).getTime()) / 36e5))
        : null;
      const totalXp =
        typeof student.totalXp === "number" && Number.isFinite(student.totalXp)
          ? Math.max(0, Math.floor(student.totalXp))
          : currentTotalXP(student.level ?? 1, student.xp ?? 0);

      return {
        id: student.id,
        name: student.name,
        totalXp,
        lastActiveIso: lastIso,
        lastActiveHours: lastHours,
      };
    });
  }, [items]);

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

    const rankingOrder = [...arr].sort((a, b) => b.totalXp - a.totalXp);
    const idToPosition = new Map<string, number>();
    rankingOrder.forEach((s, i) => idToPosition.set(s.id, i + 1));

    arr.sort((a, b) => {
      const posA = idToPosition.get(a.id)!;
      const posB = idToPosition.get(b.id)!;
      let cmp = 0;

      if (sortKey === "position") cmp = posA - posB;
      else if (sortKey === "name") cmp = a.name.localeCompare(b.name, "es");
      else if (sortKey === "xp") cmp = a.totalXp - b.totalXp;
      else if (sortKey === "lastActive") {
        if (a.lastActiveHours == null && b.lastActiveHours == null) cmp = 0;
        else if (a.lastActiveHours == null) cmp = 1;
        else if (b.lastActiveHours == null) cmp = -1;
        else cmp = a.lastActiveHours - b.lastActiveHours;
      }

      return sortDir === "asc" ? cmp : -cmp;
    });

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
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const medal = (position: number) =>
    position === 1 ? "🥇" : position === 2 ? "🥈" : position === 3 ? "🥉" : "";

  if (!ready) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <p style={{ opacity: 0.8 }}>Conectando al servidor…</p>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      {/* Header con título y acciones */}
      <header className={styles.header}>
        <div className={styles.title}>
          <span role="img" aria-label="Trofeo">🏅</span>&nbsp; Ranking de Estudiantes
        </div>

        <div className={styles.actions}>
          <input
            className={styles.search}
            placeholder="Buscar estudiante…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            aria-label="Buscar estudiante"
          />
          <select
            className={styles.pageSize}
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            aria-label="Tamaño de página"
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}/pág
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Tabla principal */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <Th active={sortKey === "position"} dir={sortDir} onClick={() => toggleSort("position")} label="Posición" />
              <Th active={sortKey === "name"} dir={sortDir} onClick={() => toggleSort("name")} label="Estudiante" />
              <Th active={sortKey === "xp"} dir={sortDir} onClick={() => toggleSort("xp")} label="XP" />
              <Th active={sortKey === "lastActive"} dir={sortDir} onClick={() => toggleSort("lastActive")} label="Última Actividad" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className={styles.empty} colSpan={4}>
                  Cargando…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td className={styles.empty} colSpan={4}>
                  {error}
                </td>
              </tr>
            ) : pageItems.length === 0 ? (
              <tr>
                <td className={styles.empty} colSpan={4}>
                  Sin resultados
                </td>
              </tr>
            ) : (
              pageItems.map((s) => (
                <tr key={s.id}>
                  <td className={styles.pos}>
                    <span className={styles.medal} aria-hidden>
                      {medal((s as any).position)}
                    </span>
                    {(s as any).position}
                  </td>
                  <td className={styles.name}>{s.name}</td>
                  <td className={styles.xp}>{nf.format(s.totalXp)} XP</td>
                  <td className={styles.last}>{timeAgo(s.lastActiveIso)}</td>
                </tr>
              ))
            )}
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

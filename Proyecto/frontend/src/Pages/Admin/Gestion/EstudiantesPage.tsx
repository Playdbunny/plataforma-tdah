// ======================================================================
// EstudiantesPage.tsx — Tabla de estudiantes (admin)
// • Buscador por nombre/correo
// • Paginación simple en front
// • Click en nombre → detalle (/admin/gestion/estudiantes/:id)
// ======================================================================

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Estudiantes.module.css";
import { useStudentsStore } from "../../../stores/studentsStore";
import { timeAgo } from "../../../utils/timeAgo";
import { useBackendReady } from "src/Hooks/useBackendReady";

export default function EstudiantesPage() {
  const ready = useBackendReady();
  const { items, list, loading, error } = useStudentsStore();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10; // filas por página (ajústalo)

  useEffect(() => {
    if (!ready) return;
    if (!items || items.length === 0) {
      void list();
    }
  }, [items, list, ready]);

  // Filtrado en memoria por nombre/email
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term)
    );
  }, [items, q]);

  // Paginación
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageClamped = Math.min(Math.max(page, 1), totalPages);
  const pageItems = filtered.slice(
    (pageClamped - 1) * pageSize,
    pageClamped * pageSize
  );

  useEffect(() => {
    // Si cambió el filtro, vuelve a la página 1
    setPage(1);
  }, [q]);

  const navigate = useNavigate();

  if (!ready) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <p style={{ opacity: 0.8 }}>Conectando al servidor…</p>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.title}>
          <span role="img" aria-label="Estudiantes">
            🎒
          </span>
          &nbsp; Lista de estudiantes
        </div>
        <div className={styles.actions}>
          <input
            className={styles.search}
            placeholder="Buscar por nombre o correo…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Buscar estudiantes"
          />
        </div>
      </header>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Estudiante</th>
              <th>Tipo TDAH</th>
              <th>Correo</th>
              <th>Última actividad</th>
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
                  <td>
                    {/* Nombre clickeable → detalle */}
                    <button
                      className={styles.linkBtn}
                      onClick={() =>
                        navigate(`/admin/gestion/estudiantes/${s.id}`)
                      }
                      title="Ver detalle"
                    >
                      {s.name}
                    </button>
                  </td>
                  <td>
                    {s.tdahType
                      ? s.tdahType === "inatento"
                        ? "Inatento"
                        : s.tdahType === "hiperactivo"
                        ? "Hiperactivo"
                        : "Combinado"
                      : "—"}
                  </td>
                  <td className={styles.mono}>{s.email}</td>
                  <td className={styles.muted}>
                    {timeAgo(s.lastActivityAt ?? s.lastLogin ?? undefined)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className={styles.pager}>
        <button
          className={styles.btn}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={pageClamped <= 1}
        >
          ◀ Anterior
        </button>
        <span className={styles.pageInfo}>
          Página <b>{pageClamped}</b> de <b>{totalPages}</b>
        </span>
        <button
          className={styles.btn}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={pageClamped >= totalPages}
        >
          Siguiente ▶
        </button>
      </div>
    </div>
  );
}

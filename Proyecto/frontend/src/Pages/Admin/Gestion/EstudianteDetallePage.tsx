// ==================================================================================
// EstudianteDetallePage.tsx — Perfil del estudiante (admin)
// • Muestra avatar, nombre, email, XP y racha
// • Barras de progreso por materia
// • Gráfico "XP ganado por semana" (SVG sin librerías)
// • Actividad reciente (lista simple)
// ==================================================================================

import { useEffect, useMemo, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import styles from "./EstudianteDetalle.module.css";
import {
  fetchAdminStudentDetail,
  type AdminStudentActivity,
  type AdminStudentDetail,
} from "../../../api/adminStudents";
import { timeAgo } from "../../../utils/timeAgo";
import { useBackendReady } from "@/hooks/useBackendReady";
import { currentTotalXP } from "../../../Lib/Levels";

function formatActivity(ev: AdminStudentActivity) {
  const amount = ev.amount >= 0 ? `+${ev.amount}` : `${ev.amount}`;
  const currency = ev.currency.toUpperCase();
  const source = ev.source.replace(/[_-]+/g, " ");
  return `${amount} ${currency} — ${source} · ${timeAgo(ev.createdAt)}`;
}

const DEFAULT_CHARACTER = {
  sprite: "/Characters/boy.gif",
  name: "Personaje",
};

export default function EstudianteDetallePage() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<AdminStudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const ready = useBackendReady();

  useEffect(() => {
    if (!ready) return;
    if (!id) {
      setNotFound(true);
      return;
    }
    setLoading(true);
    setError(null);
    fetchAdminStudentDetail(id)
      .then((detail) => {
        setStudent(detail);
        setLoading(false);
      })
      .catch((err: any) => {
        if (err?.response?.status === 404) {
          setNotFound(true);
        } else {
          const message =
            err?.response?.data?.error ?? err?.message ?? "No se pudo cargar la información";
          setError(message);
        }
        setLoading(false);
      });
  }, [id, ready]);

  const nf = useMemo(() => new Intl.NumberFormat("es-CL"), []);

  const chart = useMemo(() => {
    const data = student?.weeklyXp && student.weeklyXp.length
      ? student.weeklyXp
      : Array(7).fill(0);
    const width = 420;
    const height = 160;
    const pad = 28;
    const maxV = Math.max(...data, 0);
    const x = (i: number) => pad + (i * (width - pad * 2)) / Math.max(data.length - 1, 1);
    const y = (v: number) => {
      if (maxV <= 0) return height - pad;
      const t = v / maxV;
      return pad + (1 - t) * (height - pad * 2);
    };
    const d = data
      .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`)
      .join(" ");
    return { width, height, pad, d, x, y, maxV, data };
  }, [student?.weeklyXp]);

  const totalXp = useMemo(() => {
    if (!student) return 0;
    if (typeof student.totalXp === "number" && Number.isFinite(student.totalXp)) {
      return Math.max(0, Math.round(student.totalXp));
    }
    return currentTotalXP(student.level ?? 1, student.xp ?? 0);
  }, [student]);

  if (!ready) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <p style={{ opacity: 0.8 }}>Conectando al servidor…</p>
      </div>
    );
  }

  if (notFound) return <Navigate to="/admin/estudiantes" replace />;

  return (
    <div className={styles.screen}>
      {/* Cabecera con “back” */}
      <div className={styles.topRow}>
        <Link to="/admin/estudiantes" className={styles.back}>
          ← Volver
        </Link>
      </div>

      {loading ? (
        <div className={styles.card}>
          <div className={styles.empty}>Cargando…</div>
        </div>
      ) : error ? (
        <div className={styles.card}>
          <div className={styles.empty}>{error}</div>
        </div>
      ) : student ? (
        <>
          <div className={styles.headerCard}>
            <img
              className={styles.avatar}
              src={student.character?.sprite || DEFAULT_CHARACTER.sprite}
              alt={`Personaje de ${student.name}`}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = DEFAULT_CHARACTER.sprite;
              }}
            />
            <div className={styles.meta}>
              <h2 className={styles.name}>{student.name}</h2>
              <div className={styles.email}>{student.email}</div>
            </div>

            {/* Badges a la derecha */}
            <div className={styles.badges}>
              <span className={styles.badge}>⭐ {nf.format(totalXp)} XP</span>
              <span className={styles.badge}>🔥 RACHA {student.streakCount ?? 0} DÍAS</span>
            </div>
          </div>

          {/* Paneles: progreso por materia + gráfico semanal */}
          <div className={styles.panels}>
            <section className={`${styles.card} ${styles.progressCard}`}>
              <div className={styles.cardTitle}>Progreso por materia</div>
              <ul className={styles.progressList}>
                {(student.progress.subjects ?? []).map((p) => {
                  const pct = Number.isFinite(p.progressPercent)
                    ? Math.max(0, Math.min(100, Math.round(p.progressPercent)))
                    : 0;
                  return (
                    <li key={p.subjectId} className={styles.progressItem}>
                      <span className={styles.pLabel}>{p.subjectName}</span>
                      <div className={styles.pBar}>
                        <div className={styles.pFill} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={styles.pPct}>{pct}%</span>
                    </li>
                  );
                })}
                {(!student.progress.subjects || student.progress.subjects.length === 0) && (
                  <div className={styles.empty}>Sin datos de progreso.</div>
                )}
              </ul>
            </section>

            <section className={styles.card}>
              <div className={styles.cardTitle}>XP ganado por semana</div>
              <div className={styles.chartWrap}>
                {chart.maxV <= 0 && (student.weeklyXp ?? []).every((v) => v === 0) ? (
                  <div className={styles.empty}>Sin datos de XP recientes.</div>
                ) : (
                  <svg width={chart.width} height={chart.height}>
                    {/* grid horizontal */}
                    {Array.from({ length: 5 }).map((_, i) => {
                      const y = chart.pad + (i * (chart.height - chart.pad * 2)) / 4;
                      return (
                        <line
                          key={`grid-${i}`}
                          x1={chart.pad}
                          x2={chart.width - chart.pad}
                          y1={y}
                          y2={y}
                          stroke="#33436a"
                        />
                      );
                    })}
                    <path d={chart.d} fill="none" stroke="#8ab4ff" strokeWidth={3} />
                    {chart.data.map((v, i) => (
                      <circle
                        key={`point-${i}-${v}`}
                        cx={chart.x(i)}
                        cy={chart.y(v)}
                        r={4}
                        fill="#8ab4ff"
                      />
                    ))}
                    {/* etiquetas L..D */}
                    {["L", "M", "X", "J", "V", "S", "D"].map((lbl, i) => (
                      <text
                        key={`label-${i}-${lbl}`}
                        x={chart.x(i)}
                        y={chart.height - chart.pad / 2}
                        textAnchor="middle"
                        fontSize="12"
                        fill="#9fb5e8"
                      >
                        {lbl}
                      </text>
                    ))}
                  </svg>
                )}
              </div>
            </section>
          </div>

          {/* Actividad reciente */}
          <section className={styles.activity}>
            <div className={styles.cardTitle}>Actividad Reciente</div>
            <ul className={styles.activityList}>
              {(student.recentActivity ?? []).map((ev) => (
                <li key={ev.id}>— {formatActivity(ev)}</li>
              ))}
              {(!student.recentActivity || student.recentActivity.length === 0) && (
                <div className={styles.empty}>Sin actividad registrada.</div>
              )}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}

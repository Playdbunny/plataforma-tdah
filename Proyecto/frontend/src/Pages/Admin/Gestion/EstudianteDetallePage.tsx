// ==================================================================================
// EstudianteDetallePage.tsx — Perfil del estudiante (admin)
// • Muestra avatar, nombre, email, XP y racha
// • Barras de progreso por materia
// • Gráfico "XP ganado por semana" (SVG sin librerías)
// • Actividad reciente (lista simple)
// ==================================================================================

import { useMemo } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import styles from "./EstudianteDetalle.module.css";
import { useStudentsStore } from "../../../stores/studentsStore";

export default function EstudianteDetallePage() {
  const { id } = useParams<{ id: string }>();
  const { getById } = useStudentsStore();
  const s = getById(id || "");

  if (!s) return <Navigate to="/admin/estudiantes" replace />;

  // Cálculo rápido para el gráfico SVG
  const chart = useMemo(() => {
    const data = s.weeklyXP ?? [0, 0, 0, 0, 0, 0, 0];
    const width = 420;
    const height = 160;
    const pad = 28;

    const maxV = Math.max(...data, 1);
    const x = (i: number) => pad + (i * (width - pad * 2)) / (data.length - 1 || 1);
    const y = (v: number) => {
      const t = v / maxV;
      return pad + (1 - t) * (height - pad * 2);
    };
    const d = data.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");
    return { width, height, pad, d, x, y, maxV, data };
  }, [s.weeklyXP]);

  return (
    <div className={styles.screen}>
      {/* Cabecera con “back” */}
      <div className={styles.topRow}>
        <Link to="/admin/estudiantes" className={styles.back}>
          ← Volver
        </Link>
      </div>

      <div className={styles.headerCard}>
        <img
          className={styles.avatar}
          src={s.avatarUrl || "/Images/default-profile.jpg"}
          alt={`Avatar de ${s.name}`}
        />
        <div className={styles.meta}>
          <h2 className={styles.name}>{s.name}</h2>
          <div className={styles.email}>{s.email}</div>
        </div>

        {/* Badges a la derecha */}
        <div className={styles.badges}>
          <span className={styles.badge}>⭐ {s.xp} XP</span>
          <span className={styles.badge}>🔥 RACHA {s.streakDays ?? 0} DÍAS</span>
        </div>
      </div>

      {/* Paneles: progreso por materia + gráfico semanal */}
      <div className={styles.panels}>
        <section className={styles.card}>
          <div className={styles.cardTitle}>Progreso por materia</div>
          <ul className={styles.progressList}>
            {(s.progressBySubject ?? []).map((p) => (
              <li key={p.slug} className={styles.progressItem}>
                <span className={styles.pLabel}>{p.label}</span>
                <div className={styles.pBar}>
                  <div
                    className={styles.pFill}
                    style={{ width: `${Math.max(0, Math.min(100, p.progress))}%` }}
                  />
                </div>
                <span className={styles.pPct}>{p.progress}%</span>
              </li>
            ))}
            {(!s.progressBySubject || s.progressBySubject.length === 0) && (
              <div className={styles.empty}>Sin datos de progreso.</div>
            )}
          </ul>
        </section>

        <section className={styles.card}>
          <div className={styles.cardTitle}>XP ganado por semana</div>
          <div className={styles.chartWrap}>
            <svg width={chart.width} height={chart.height}>
              {/* grid horizontal */}
              {Array.from({ length: 5 }).map((_, i) => {
                const y = chart.pad + (i * (chart.height - chart.pad * 2)) / 4;
                return (
                  <line
                    key={i}
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
                <circle key={i} cx={chart.x(i)} cy={chart.y(v)} r={4} fill="#8ab4ff" />
              ))}
              {/* etiquetas L..D */}
              {["L", "M", "X", "J", "V", "S", "D"].map((lbl, i) => (
                <text
                  key={i}
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
          </div>
        </section>
      </div>

      {/* Actividad reciente */}
      <section className={styles.activity}>
        <div className={styles.cardTitle}>Actividad Reciente</div>
        <ul className={styles.activityList}>
          {(s.recentActivity ?? []).map((ev, i) => (
            <li key={i}>— {ev}</li>
          ))}
          {(!s.recentActivity || s.recentActivity.length === 0) && (
            <div className={styles.empty}>Sin actividad registrada.</div>
          )}
        </ul>
      </section>
    </div>
  );
}

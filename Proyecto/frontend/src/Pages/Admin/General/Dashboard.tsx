// Dashboard.tsx
// Vista principal del panel de admin con:
// - KPIs (Estudiantes activos, XP total, Materiales, Alumno destacado)
// - Gráfico de "Evolución XP" (SVG sin librerías externas) con selector de rango
// - Actividad reciente (timeline) + skeleton/empty

import styles from "./Dashboard.module.css";
import { useMemo, useState } from "react";

// Tipos mínimos para conectar luego con tu backend
type Student = {
  id: string;
  name: string;
  xp: number;
  lastActiveAt?: string; // ISO
};

type Material = {
  id: string;
  title: string;
  subjectId: string;
};

// Helper: formateo de números según ES
const formatNumber = (n: number) =>
  new Intl.NumberFormat("es-CL").format(n);

export default function AdminDashboard() {
  // ───────────── MOCK DATA (reemplázalo con datos reales del backend) ─────────────
  const students: Student[] = [
    { id: "1", name: "Ana", xp: 850, lastActiveAt: "2025-08-30T11:00:00Z" },
    { id: "2", name: "Juan", xp: 520, lastActiveAt: "2025-08-30T08:50:00Z" },
    { id: "3", name: "Pedro", xp: 430, lastActiveAt: "2025-08-29T21:10:00Z" },
  ];

  const materials: Material[] = [];

  // Rangos (para cuando conectes al backend puedes pedir 7/30/90 días)
  const [range, setRange] = useState<"7d" | "30d" | "90d">("7d");

  // Datos de ejemplo por rango (mismo shape, distintos valores)
  const weeklyXPByRange: Record<typeof range, number[]> = {
    "7d": [20, 28, 25, 35, 36, 42, 50],
    "30d": [10, 14, 18, 22, 28, 31, 33, 29, 35, 38, 42, 39, 45, 47, 48, 44, 49, 51, 53, 50, 55, 58, 61, 60, 63, 65, 67, 66, 70, 72],
    "90d": Array.from({ length: 90 }, (_, i) => 15 + Math.round(8 * Math.sin(i / 6) + i / 12)),
  };

  // Etiquetas del eje X (para 7 días mantenemos L..D, para otros mostramos índices)
  const weekLabels7 = ["L", "M", "X", "J", "V", "S", "D"];

  // Selección de serie según rango
  const serie = weeklyXPByRange[range];

  // Alumno destacado (máximo XP)
  const topStudent = useMemo(
    () => students.slice().sort((a, b) => b.xp - a.xp)[0],
    [students]
  );

  // Métricas básicas
  const totalXP = useMemo(
    () => students.reduce((acc, s) => acc + (s.xp || 0), 0),
    [students]
  );
  const activeStudents = useMemo(
    // Mock: “activo” = tiene XP > 0; ajusta a tu definición real
    () => students.filter((s) => (s.xp || 0) > 0).length,
    [students]
  );

  // (cuando tengas fetch real) usa estos flags
  const isLoading = false;
  const error: string | null = null;

  // ───────────── Helpers para gráfico (coordenadas SVG) ─────────────
  const chart = useMemo(() => {
    // Dimensiones lógicas del gráfico (con viewBox para ser fluido)
    const width = 800;
    const height = 260;
    const padding = 40;

    if (!serie || serie.length === 0) {
      return {
        width, height, padding,
        x: (i: number) => padding,
        y: (v: number) => height - padding,
        d: "",
        maxVal: 0, minVal: 0,
      };
    }

    // Calcular min/max para escalar los puntos al alto disponible
    const maxVal = Math.max(...serie, 0);
    const minVal = Math.min(...serie, 0);

    // Escalas (lineal simple)
    const x = (i: number) =>
      padding + (i * (width - padding * 2)) / Math.max(serie.length - 1, 1);
    const y = (v: number) => {
      // invertimos porque en SVG y crece hacia abajo
      const usableH = height - padding * 2;
      const t = (v - minVal) / Math.max(maxVal - minVal || 1, 1);
      return padding + (1 - t) * usableH;
    };

    // Path para línea
    const d = serie
      .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
      .join(" ");

    return { width, height, padding, x, y, d, maxVal, minVal };
  }, [serie]);

  // ───────────── Render ─────────────
  if (error) {
    return (
      <div role="alert" className={styles.error}>
        Error: {error}
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      {/* KPIs */}
      {isLoading ? (
        <div className={styles.skelRow} aria-hidden />
      ) : (
        <section className={styles.kpis}>
          <div className={styles.kpi} role="group" aria-label="Estudiantes activos">
            <div className={styles.kpiIcon} aria-hidden>👥</div>
            <div className={styles.kpiText}>
              <div className={styles.kpiNumber}>{formatNumber(activeStudents)}</div>
              <div className={styles.kpiLabel}>Estudiantes activos</div>
            </div>
          </div>

          <div className={styles.kpi} role="group" aria-label="XP total">
            <div className={styles.kpiIcon} aria-hidden>⭐</div>
            <div className={styles.kpiText}>
              <div className={styles.kpiNumber}>{formatNumber(totalXP)}</div>
              <div className={styles.kpiLabel}>XP total</div>
            </div>
          </div>

          <div className={styles.kpi} role="group" aria-label="Materiales">
            <div className={styles.kpiIcon} aria-hidden>📚</div>
            <div className={styles.kpiText}>
              <div className={styles.kpiNumber}>{formatNumber(materials.length)}</div>
              <div className={styles.kpiLabel}>Materiales</div>
            </div>
          </div>

          <div className={styles.kpi} role="group" aria-label="Alumno destacado">
            <div className={styles.kpiIcon} aria-hidden>🏅</div>
            <div className={styles.kpiText}>
              <div className={styles.kpiNumber}>{topStudent?.name ?? "—"}</div>
              <div className={styles.kpiLabel}>
                {topStudent ? `${formatNumber(topStudent.xp)} XP` : "Sin datos"}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Gráfico + título estilo “tab” */}
      <section className={styles.chartCard}>
        {/* Header del gráfico: título + selector de rango */}
        <div className={styles.chartHeader}>
          <div className={styles.tabTitle}>Evolución XP</div>
          <div className={styles.range} role="tablist" aria-label="Rango de fechas">
            {(["7d", "30d", "90d"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`${styles.rangeBtn} ${range === r ? styles.active : ""}`}
                aria-pressed={range === r}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Contenedor del gráfico */}
        <div className={styles.chartInner}>
          {serie.length === 0 ? (
            <div className={styles.empty}>No hay datos en el rango seleccionado.</div>
          ) : (
            <svg
              viewBox={`0 0 ${chart.width} ${chart.height}`}
              width="100%"
              height="260"
              role="img"
              aria-label={`Gráfico de XP (${range})`}
            >
              {/* Líneas de guía horizontales (grid) */}
              {Array.from({ length: 6 }).map((_, i) => {
                const y = chart.padding + i * ((chart.height - chart.padding * 2) / 5);
                return (
                  <line
                    key={i}
                    x1={chart.padding}
                    x2={chart.width - chart.padding}
                    y1={y}
                    y2={y}
                    stroke="#e5e7eb"
                  />
                );
              })}

              {/* Eje Y (simplificado con ticks 0..maxVal aprox) */}
              {Array.from({ length: 6 }).map((_, i) => {
                const val = Math.round(
                  chart.minVal + (i * (chart.maxVal - chart.minVal)) / 5
                );
                const y = chart.padding + (5 - i) * ((chart.height - chart.padding * 2) / 5);
                return (
                  <text
                    key={i}
                    x={chart.padding - 10}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="12"
                    fill="#6b7280"
                  >
                    {val}
                  </text>
                );
              })}

              {/* Línea de datos */}
              <path d={chart.d} fill="none" stroke="#2563eb" strokeWidth={3} />

              {/* Puntos */}
              {serie.map((v, i) => (
                <circle key={i} cx={chart.x(i)} cy={chart.y(v)} r={4} fill="#2563eb" />
              ))}

              {/* Etiquetas de X */}
              {(range === "7d" ? weekLabels7 : serie.map((_, i) => (i + 1).toString())).map(
                (lbl, i) => (
                  <text
                    key={i}
                    x={chart.x(i)}
                    y={chart.height - chart.padding / 2}
                    textAnchor="middle"
                    fontSize="12"
                    fill="#374151"
                  >
                    {lbl}
                  </text>
                )
              )}
            </svg>
          )}
        </div>
      </section>

      {/* Actividad reciente */}
      <section className={styles.activity}>
        <div className={styles.activityCard}>
          <ul className={styles.timeline}>
            <li>
              <span className={`${styles.dot} ${styles.dotBlue}`} />
              <span className={styles.event}>
                Juan completó una actividad personalizada (+20 XP)
              </span>
              <span className={styles.time}>hace 2h</span>
            </li>
            <li>
              <span className={`${styles.dot} ${styles.dotGreen}`} />
              <span className={styles.event}>
                Ana subió nuevo material (+30 XP)
              </span>
              <span className={styles.time}>hace 5h</span>
            </li>
            <li>
              <span className={`${styles.dot} ${styles.dotYellow}`} />
              <span className={styles.event}>Pedro inició sesión</span>
              <span className={styles.time}>hace 6h</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}

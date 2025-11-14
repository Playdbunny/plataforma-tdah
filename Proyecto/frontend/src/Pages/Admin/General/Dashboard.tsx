// Dashboard.tsx
// Vista principal del panel de admin con:
// - KPIs diarios (finalización, tiempo promedio e XP otorgado)
// - Gráfico de "Evolución XP" (SVG sin librerías externas) con selector de rango
// - Actividad reciente (timeline) + skeleton/empty

import styles from "./Dashboard.module.css";
import { useEffect, useMemo, useState } from "react";
import { useBackendReady } from "@/hooks/useBackendReady";
import { getAdminTodayKpis, type AdminTodayKpis } from "@/api/adminKpis";
import {
  getAdminDashboardOverview,
  type AdminDashboardOverview,
} from "@/api/admin";
import { formatMMSS, formatShortNumber } from "@/utils/formatters";

const formatNumber = (n: number) => new Intl.NumberFormat("es-CL").format(n);

export default function AdminDashboard() {
  const ready = useBackendReady();
  const [kpis, setKpis] = useState<AdminTodayKpis | null>(null);
  const [kpisLoading, setKpisLoading] = useState(true);
  const [kpisError, setKpisError] = useState<string | null>(null);
  const [overview, setOverview] = useState<AdminDashboardOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!ready) return;

    let active = true;

    async function loadKpis() {
      setKpisLoading(true);
      setKpisError(null);
      try {
        const data = await getAdminTodayKpis();
        if (active) setKpis(data);
      } catch (err) {
        if (!active) return;
        console.error("Error cargando KPIs diarios", err);
        const message =
          (err as any)?.response?.data?.error ??
          (err instanceof Error ? err.message : "No se pudo cargar la información");
        setKpisError(message);
        setKpis(null);
      } finally {
        if (active) setKpisLoading(false);
      }
    }

    loadKpis();
    return () => {
      active = false;
    };
  }, [ready]);

  useEffect(() => {
    if (!ready) return;

    let active = true;

    async function loadOverview() {
      setOverviewLoading(true);
      setOverviewError(null);
      try {
        const data = await getAdminDashboardOverview();
        if (active) setOverview(data);
      } catch (err) {
        if (!active) return;
        console.error("Error cargando overview del dashboard", err);
        const message =
          (err as any)?.response?.data?.error ??
          (err instanceof Error ? err.message : "No se pudo cargar la información");
        setOverviewError(message);
        setOverview(null);
      } finally {
        if (active) setOverviewLoading(false);
      }
    }

    loadOverview();
    return () => {
      active = false;
    };
  }, [ready]);

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
  if (!ready) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <p style={{ opacity: 0.8 }}>Conectando al servidor…</p>
      </div>
    );
  }

  const safeKpis: AdminTodayKpis = kpis ?? {
    started: 0,
    completed: 0,
    completionRatePct: 0,
    avgDurationSec: 0,
    xpAwarded: 0,
  };
  const completionPct = Number.isFinite(safeKpis.completionRatePct)
    ? Math.round(safeKpis.completionRatePct)
    : 0;
  const completionHint = `${safeKpis.completed.toLocaleString("es-CL")}/${safeKpis.started.toLocaleString(
    "es-CL",
  )} intentos`;
  const xpHint = `${safeKpis.xpAwarded.toLocaleString("es-CL")} XP`;

  const topStudent = overview?.topStudent;
  const topStudentName = topStudent?.name ?? (overviewLoading ? "Cargando…" : "—");
  const levelLabel =
    typeof topStudent?.level === "number" ? ` · Nivel ${topStudent.level}` : "";
  const topStudentHint = topStudent
    ? `${formatNumber(topStudent.totalXp ?? topStudent.xp ?? 0)} XP${levelLabel}`
    : overviewLoading
    ? "Buscando alumno destacado…"
    : "Sin datos";

  const showSkeleton = kpisLoading && overviewLoading;

  return (
    <div className={styles.screen}>
      {/* KPIs */}
      {showSkeleton ? (
        <div className={styles.skelRow} aria-hidden />
      ) : (
        <>
          <section className={styles.kpis}>
            <div className={styles.kpi} role="group" aria-label="Finalización hoy">
              <div className={styles.kpiIcon} aria-hidden>
                📈
              </div>
              <div className={styles.kpiText}>
                <div className={styles.kpiLabel}>Finalización hoy</div>
                <div className={styles.kpiNumber}>{completionPct}%</div>
                <div className={styles.kpiHint}>{completionHint}</div>
              </div>
            </div>

            <div className={styles.kpi} role="group" aria-label="Tiempo medio por intento">
              <div className={styles.kpiIcon} aria-hidden>
                ⏱️
              </div>
              <div className={styles.kpiText}>
                <div className={styles.kpiLabel}>Tiempo medio por intento</div>
                <div className={styles.kpiNumber}>{formatMMSS(safeKpis.avgDurationSec)}</div>
                <div className={styles.kpiHint}>mm:ss</div>
              </div>
            </div>

            <div className={styles.kpi} role="group" aria-label="XP otorgado hoy">
              <div className={styles.kpiIcon} aria-hidden>
                ⚡
              </div>
              <div className={styles.kpiText}>
                <div className={styles.kpiLabel}>XP otorgado hoy</div>
                <div className={styles.kpiNumber}>{formatShortNumber(safeKpis.xpAwarded)}</div>
                <div className={styles.kpiHint}>{xpHint}</div>
              </div>
            </div>

            <div className={styles.kpi} role="group" aria-label="Alumno destacado">
              <div className={styles.kpiIcon} aria-hidden>
                🏅
              </div>
              <div className={styles.kpiText}>
                <div className={styles.kpiLabel}>Alumno destacado</div>
                <div className={styles.kpiNumber}>{topStudentName}</div>
                <div className={styles.kpiHint}>{topStudentHint}</div>
              </div>
            </div>
          </section>
          {(kpisError || overviewError) && (
            <p role="status" className={styles.kpiError}>
              {kpisError && <>No se pudieron actualizar los KPIs. {kpisError} </>}
              {overviewError && <>No se pudo cargar el alumno destacado. {overviewError}</>}
            </p>
          )}
        </>
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
                    key={`grid-${i}`}
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
                    key={`tick-${i}-${val}`}
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
                <circle
                  key={`point-${i}-${v}`}
                  cx={chart.x(i)}
                  cy={chart.y(v)}
                  r={4}
                  fill="#2563eb"
                />
              ))}

              {/* Etiquetas de X */}
              {(range === "7d" ? weekLabels7 : serie.map((_, i) => (i + 1).toString())).map(
                (lbl, i) => (
                  <text
                    key={`label-${i}-${lbl}`}
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

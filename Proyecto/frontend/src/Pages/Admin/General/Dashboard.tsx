// Dashboard.tsx
// Vista principal del panel de admin con:
// - KPIs diarios (finalización, tiempo promedio e XP otorgado)
// - Gráfico de "Evolución XP" (SVG sin librerías externas) con selector de rango
// - Actividad reciente (timeline) + skeleton/empty

import styles from "./Dashboard.module.css";
import { useEffect, useMemo, useState } from "react";
import { useBackendReady } from "src/Hooks/useBackendReady";
import { getAdminTodayKpis, type AdminTodayKpis } from "@/api/adminKpis";
import {
  getAdminDashboardOverview,
  type AdminDashboardOverview,
} from "@/api/admin";
import {
  getAvgCompletionTime,
  getStudentsGrowth,
  type AvgCompletionTimePoint,
  type StudentsGrowthPoint,
} from "@/api/adminDashboard";
import { formatMMSS, formatShortNumber } from "@/utils/formatters";

const formatNumber = (n: number) => new Intl.NumberFormat("es-CL").format(n);

const rangeDaysMap = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
} as const;

type RangeKey = keyof typeof rangeDaysMap;

type ChartData = {
  width: number;
  height: number;
  padding: number;
  x: (i: number) => number;
  y: (v: number) => number;
  d: string;
  maxVal: number;
  minVal: number;
};

const buildChart = (serie: number[]): ChartData => {
  const width = 800;
  const height = 260;
  const padding = 40;

  if (!serie || serie.length === 0) {
    return {
      width,
      height,
      padding,
      x: () => padding,
      y: () => height - padding,
      d: "",
      maxVal: 0,
      minVal: 0,
    };
  }

  const maxVal = Math.max(...serie, 0);
  const minVal = Math.min(...serie, 0);

  const x = (i: number) =>
    padding + (i * (width - padding * 2)) / Math.max(serie.length - 1, 1);
  const y = (v: number) => {
    const usableH = height - padding * 2;
    const t = (v - minVal) / Math.max(maxVal - minVal || 1, 1);
    return padding + (1 - t) * usableH;
  };

  const d = serie
    .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(" ");

  return { width, height, padding, x, y, d, maxVal, minVal };
};

const weekdayFormatter = new Intl.DateTimeFormat("es-CL", { weekday: "short" });
const dateFormatter = new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short" });

const formatLabelForRange = (isoDate: string, range: RangeKey) => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  if (range === "7d") return weekdayFormatter.format(date).replace(".", "").toUpperCase();
  return dateFormatter.format(date).replace(".", "");
};

const renderLineChart = (
  chart: ChartData,
  serie: number[],
  labels: string[],
  color: string,
  tickFormatter?: (value: number) => string,
  ariaLabel?: string,
) => (
  <svg
    viewBox={`0 0 ${chart.width} ${chart.height}`}
    width="100%"
    height="260"
    role="img"
    aria-label={ariaLabel}
  >
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

    {Array.from({ length: 6 }).map((_, i) => {
      const val = Math.round(chart.minVal + (i * (chart.maxVal - chart.minVal)) / 5);
      const y = chart.padding + (5 - i) * ((chart.height - chart.padding * 2) / 5);
      const label = tickFormatter ? tickFormatter(val) : val;
      return (
        <text
          key={`tick-${i}-${val}`}
          x={chart.padding - 10}
          y={y + 4}
          textAnchor="end"
          fontSize="12"
          fill="#6b7280"
        >
          {label}
        </text>
      );
    })}

    <path d={chart.d} fill="none" stroke={color} strokeWidth={3} />

    {serie.map((v, i) => (
      <circle key={`point-${i}-${v}`} cx={chart.x(i)} cy={chart.y(v)} r={4} fill={color} />
    ))}

    {labels.map((lbl, i) => (
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
    ))}
  </svg>
);

export default function AdminDashboard() {
  const ready = useBackendReady();
  const [kpis, setKpis] = useState<AdminTodayKpis | null>(null);
  const [kpisLoading, setKpisLoading] = useState(true);
  const [kpisError, setKpisError] = useState<string | null>(null);
  const [overview, setOverview] = useState<AdminDashboardOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [range, setRange] = useState<RangeKey>("7d");

  const [studentGrowth, setStudentGrowth] = useState<StudentsGrowthPoint[] | null>(null);
  const [studentGrowthLoading, setStudentGrowthLoading] = useState(true);
  const [studentGrowthError, setStudentGrowthError] = useState<string | null>(null);

  const [avgCompletion, setAvgCompletion] = useState<AvgCompletionTimePoint[] | null>(null);
  const [avgCompletionLoading, setAvgCompletionLoading] = useState(true);
  const [avgCompletionError, setAvgCompletionError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!ready) return;

    let active = true;

    async function loadGrowth() {
      setStudentGrowthLoading(true);
      setStudentGrowthError(null);
      try {
        const data = await getStudentsGrowth(rangeDaysMap[range]);
        if (active) setStudentGrowth(data.points);
      } catch (err) {
        if (!active) return;
        console.error("Error cargando crecimiento de alumnos", err);
        const message =
          (err as any)?.response?.data?.error ??
          (err instanceof Error ? err.message : "No se pudo cargar la información");
        setStudentGrowthError(message);
        setStudentGrowth(null);
      } finally {
        if (active) setStudentGrowthLoading(false);
      }
    }

    loadGrowth();
    return () => {
      active = false;
    };
  }, [ready, range]);

  useEffect(() => {
    if (!ready) return;

    let active = true;

    async function loadAvgCompletion() {
      setAvgCompletionLoading(true);
      setAvgCompletionError(null);
      try {
        const data = await getAvgCompletionTime(rangeDaysMap[range]);
        if (active) setAvgCompletion(data.points);
      } catch (err) {
        if (!active) return;
        console.error("Error cargando tiempo promedio", err);
        const message =
          (err as any)?.response?.data?.error ??
          (err instanceof Error ? err.message : "No se pudo cargar la información");
        setAvgCompletionError(message);
        setAvgCompletion(null);
      } finally {
        if (active) setAvgCompletionLoading(false);
      }
    }

    loadAvgCompletion();
    return () => {
      active = false;
    };
  }, [ready, range]);

  const studentGrowthSerie = useMemo(() => {
    if (!studentGrowth) return [];
    return studentGrowth.map((point) => ({
      label: formatLabelForRange(point.date, range),
      value: point.totalStudents,
    }));
  }, [studentGrowth, range]);

  const avgCompletionSerie = useMemo(() => {
    if (!avgCompletion) return [];
    return avgCompletion.map((point) => ({
      label: formatLabelForRange(point.date, range),
      value: point.avgDurationSec,
    }));
  }, [avgCompletion, range]);

  const studentGrowthChart = useMemo(
    () => buildChart(studentGrowthSerie.map((p) => p.value)),
    [studentGrowthSerie],
  );
  const avgCompletionChart = useMemo(
    () => buildChart(avgCompletionSerie.map((p) => p.value)),
    [avgCompletionSerie],
  );

  const lastGrowthPoint =
    studentGrowth && studentGrowth.length > 0
      ? studentGrowth[studentGrowth.length - 1]
      : null;
  const lastAvgPoint =
    avgCompletion && avgCompletion.length > 0
      ? avgCompletion[avgCompletion.length - 1]
      : null;

  const showSkeleton = kpisLoading && overviewLoading;

  const studentsTotal = formatNumber(lastGrowthPoint?.totalStudents ?? 0);
  const studentsDelta = formatNumber(lastGrowthPoint?.newStudents ?? 0);
  const avgCompletionNow = formatMMSS(Math.round(lastAvgPoint?.avgDurationSec ?? 0));

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

      <section className={styles.chartGrid}>
        <article className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.tabTitle}>Crecimiento de alumnos</div>
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
          <p className={styles.chartSubtitle}>
            Total de alumnos conectados: <strong>{studentsTotal}</strong>{" "}
            <span className={styles.chartDelta}>+{studentsDelta} en el rango</span>
          </p>
          <div className={styles.chartInner}>
            {studentGrowthLoading ? (
              <div className={styles.empty}>Cargando datos…</div>
            ) : studentGrowthSerie.length === 0 ? (
              <div className={styles.empty}>No hay datos en el rango seleccionado.</div>
            ) : (
              renderLineChart(
                studentGrowthChart,
                studentGrowthSerie.map((p) => p.value),
                studentGrowthSerie.map((p) => p.label),
                "#2563eb",
                undefined,
                `Crecimiento de alumnos (${range})`,
              )
            )}
          </div>
          {studentGrowthError && (
            <p role="status" className={styles.chartError}>
              No se pudo cargar el crecimiento de alumnos. {studentGrowthError}
            </p>
          )}
        </article>

        <article className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.tabTitle}>Tiempo promedio</div>
            <div className={styles.rangeLabel}>{range.toUpperCase()}</div>
          </div>
          <p className={styles.chartSubtitle}>
            Promedio actual: <strong>{avgCompletionNow}</strong>
          </p>
          <div className={styles.chartInner}>
            {avgCompletionLoading ? (
              <div className={styles.empty}>Cargando datos…</div>
            ) : avgCompletionSerie.length === 0 ? (
              <div className={styles.empty}>No hay datos en el rango seleccionado.</div>
            ) : (
              renderLineChart(
                avgCompletionChart,
                avgCompletionSerie.map((p) => p.value),
                avgCompletionSerie.map((p) => p.label),
                "#0f766e",
                (value) => formatMMSS(Math.max(0, Math.round(value))),
                `Tiempo promedio (${range})`,
              )
            )}
          </div>
          {avgCompletionError && (
            <p role="status" className={styles.chartError}>
              No se pudo cargar el tiempo promedio. {avgCompletionError}
            </p>
          )}
        </article>
      </section>
    </div>
  );
}

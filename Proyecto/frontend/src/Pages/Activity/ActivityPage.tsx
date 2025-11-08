import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  getActivityDetail,
  type ActivitySummary,
} from "../../api/activities";
import ActivityLayout from "../../Layouts/ActivityLayout/ActivityLayout";
import styles from "./ActivityPage.module.css";
import { resolveActivityType, type ActivityDetail } from "./Plantillas/shared";
import InfografiaTemplate from "./Plantillas/Infografia/Infografia";
import PPTAnimadaTemplate from "./Plantillas/PPT-Animada/PPT-Animada";
import QuizTemplate from "./Plantillas/Quiz/Quiz";
import VideoTemplate from "./Plantillas/Video/Video";

const SUPPORTED_TYPES = new Set(["infografia", "ppt-animada", "quiz", "video"]);

type LoadState = "idle" | "loading" | "ready" | "error" | "notfound";

type ActivityResponse = ActivitySummary & {
  config?: Record<string, unknown> | null;
  templateType?: string | null;
};

function GenericActivity({ activity, backTo }: { activity: ActivityDetail; backTo: string }) {
  return (
    <ActivityLayout
      title={<span>{activity.title}</span>}
      backTo={backTo}
    >
      <div style={{
        padding: "48px",
        color: "#f1f5ff",
        fontFamily: "'Press Start 2P', system-ui, sans-serif",
        maxWidth: "640px",
        textAlign: "center",
      }}>
        <p>
          Aún no hay una plantilla disponible para este tipo de actividad.
        </p>
        {activity.description ? <p>{activity.description}</p> : null}
      </div>
    </ActivityLayout>
  );
}

export default function ActivityPage() {
  const { subjectId, activitySlug } = useParams<{
    subjectId: string;
    activitySlug: string;
  }>();
  const [status, setStatus] = useState<LoadState>("idle");
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const normalizedSlug = useMemo(() => activitySlug?.trim() ?? "", [activitySlug]);

  useEffect(() => {
    if (!normalizedSlug) return;
    let isMounted = true;
    setStatus("loading");
    getActivityDetail(normalizedSlug)
      .then((data: ActivityResponse) => {
        if (!isMounted) return;
        if (!data) {
          setStatus("notfound");
          return;
        }
        setActivity(data as ActivityDetail);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        if ((err as any)?.response?.status === 404) {
          setStatus("notfound");
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo cargar la actividad.",
        );
        setStatus("error");
      });
    return () => {
      isMounted = false;
    };
  }, [normalizedSlug]);

  if (!activitySlug) {
    return <Navigate to={subjectId ? `/subjects/${subjectId}` : "/subjects"} replace />;
  }

  if (status === "loading" || status === "idle") {
    return (
      <div className={styles.screen}>
        <div className={styles.feedback}>
          <h1>Cargando actividad…</h1>
          <p>Estamos preparando la experiencia interactiva para ti.</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={styles.screen}>
        <div className={styles.feedback}>
          <h1>Ups, algo salió mal</h1>
          <p>{error ?? "No se pudo cargar la actividad."}</p>
          <div className={styles.actions}>
            <Link to={subjectId ? `/subjects/${subjectId}` : "/subjects"}>
              Volver a la materia
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (status === "notfound" || !activity) {
    return <Navigate to={subjectId ? `/subjects/${subjectId}` : "/subjects"} replace />;
  }

  const subjectSlug = activity.subjectSlug ?? subjectId ?? "";
  const backTo = subjectSlug ? `/subjects/${subjectSlug}` : "/subjects";

  const templateType = resolveActivityType(activity);

  if (!templateType || !SUPPORTED_TYPES.has(templateType)) {
    return <GenericActivity activity={activity} backTo={backTo} />;
  }

  switch (templateType) {
    case "infografia":
      return <InfografiaTemplate activity={activity} backTo={backTo} />;
    case "ppt-animada":
      return <PPTAnimadaTemplate activity={activity} backTo={backTo} />;
    case "quiz":
      return <QuizTemplate activity={activity} backTo={backTo} />;
    case "video":
      return <VideoTemplate activity={activity} backTo={backTo} />;
    default:
      return <GenericActivity activity={activity} backTo={backTo} />;
  }
}

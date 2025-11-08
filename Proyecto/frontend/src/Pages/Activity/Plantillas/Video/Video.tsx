import { useMemo } from "react";
import ActivityLayout from "../../../../Layouts/ActivityLayout/ActivityLayout";
import styles from "./Video.module.css";
import type { ActivityTemplateProps } from "../shared";
import { resolveResourceUrl } from "../shared";

function buildEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      const videoId =
        parsed.searchParams.get("v") ?? parsed.pathname.replace(/^\//, "");
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
    if (host.includes("vimeo.com")) {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      if (id) {
        return `https://player.vimeo.com/video/${id}`;
      }
    }
  } catch (_err) {
    return null;
  }
  return null;
}

export default function VideoTemplate({ activity, backTo }: ActivityTemplateProps) {
  const resourceUrl = resolveResourceUrl(activity.config);
  const embedUrl = useMemo(() => (resourceUrl ? buildEmbedUrl(resourceUrl) : null), [
    resourceUrl,
  ]);

  const backMessage = activity.description ??
    "Disfruta del video y toma apuntes importantes para tu aprendizaje.";

  return (
    <ActivityLayout title={<span className={styles.videoTitle}>{activity.title}</span>} backTo={backTo}>
      <div className={styles.videoBg}>
        <div className={styles.videoContent}>
          <div className={styles.sidePanelGroup}>
            <div className={`${styles.sidePanel} ${styles.topPanel}`}>
              <img src="/Gifs/Fuegito.gif" alt="Decoración" className={styles.panelIcon} />
              <span className={styles.panelText}>{backMessage}</span>
            </div>
          <div className={`${styles.sidePanel} ${styles.bottomPanel}`}>
            <img src="/Gifs/Pixel Owl Gif.gif" alt="Consejo" className={styles.panelIcon} />
            <span className={styles.panelText}>
              Recuerda tomar notas
              <br />
              y pausa el video si lo necesitas.
            </span>
          </div>
          </div>
          <div className={styles.videoMain}>
            {embedUrl ? (
              <iframe
                className={styles.videoPlayer}
                src={embedUrl}
                title={activity.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : resourceUrl ? (
              <video
                className={styles.videoPlayer}
                src={resourceUrl}
                controls
                poster={activity.bannerUrl ?? "/Images/video-poster.png"}
              >
                Tu navegador no soporta el video.
              </video>
            ) : (
              <div className={styles.emptyState}>
                No se ha adjuntado ningún video para esta actividad.
              </div>
            )}
          </div>
          <div className={styles.finishedBtn}>
            <span>¡Buen trabajo!</span>
            <span className={styles.coinValue}>+{activity.xpReward ?? 0}</span>
          </div>
        </div>
      </div>
    </ActivityLayout>
  );
}

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

  const backMessage =
    activity.description ??
    "Disfruta del video, toma apuntes importantes y pausa cuando lo necesites.";

  const openInNewTab = () => {
    if (!resourceUrl) return;
    const target = embedUrl ?? resourceUrl;
    window.open(target, "_blank", "noopener,noreferrer");
  };

  const hasVideo = Boolean(embedUrl || resourceUrl);

  return (
    <ActivityLayout
      title={<span className={styles.videoTitle}>{activity.title}</span>}
      backTo={backTo}
    >
      <div className={styles.videoWrapper}>
        <section className={styles.playerColumn}>
          <header className={styles.playerHeader}>
            <h2 className={styles.sectionTitle}>Reproductor</h2>
            {hasVideo ? (
              <button className={styles.secondaryButton} onClick={openInNewTab} type="button">
                Abrir en pestaña nueva
              </button>
            ) : null}
          </header>
          <div className={styles.playerSurface}>
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
          <p className={styles.playerHint}>
            Consejo: utiliza la barra espaciadora para pausar o reanudar rápidamente el
            contenido.
          </p>
        </section>
        <aside className={styles.sideColumn}>
          <div className={styles.infoCard}>
            <img
              src="/Gifs/Fuegito.gif"
              alt="Decoración"
              className={styles.cardIcon}
              loading="lazy"
            />
            <p className={styles.cardText}>{backMessage}</p>
          </div>
          <div className={styles.infoCard}>
            <img
              src="/Gifs/Pixel Owl Gif.gif"
              alt="Consejo"
              className={styles.cardIcon}
              loading="lazy"
            />
            <p className={styles.cardText}>
              Comparte tus apuntes con tu docente o compañeros para reforzar el aprendizaje.
            </p>
          </div>
          <div className={styles.rewardCard}>
            <span className={styles.rewardLabel}>Monedas</span>
            <span className={styles.rewardValue}>+{activity.xpReward ?? 0}</span>
          </div>
        </aside>
      </div>
    </ActivityLayout>
  );
}

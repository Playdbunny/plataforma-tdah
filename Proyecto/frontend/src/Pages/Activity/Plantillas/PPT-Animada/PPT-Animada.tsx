import { useRef } from "react";
import ActivityLayout from "../../../../Layouts/ActivityLayout/ActivityLayout";
import type { ActivityTemplateProps } from "../shared";
import { resolveResourceUrl } from "../shared";
import styles from "./PPT-Animada.module.css";

export default function PPTAnimada({ activity, backTo }: ActivityTemplateProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const resourceUrl = resolveResourceUrl(activity.config);
  const description =
    activity.description ??
    "Toma un cuaderno o tu tablet para registrar los puntos clave de la presentación.";

  const requestFullscreen = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const method =
      iframe.requestFullscreen ||
      (iframe as any).webkitRequestFullscreen ||
      (iframe as any).mozRequestFullScreen ||
      (iframe as any).msRequestFullscreen;
    if (method) {
      method.call(iframe);
    }
  };

  const openInNewTab = () => {
    if (!resourceUrl) return;
    window.open(resourceUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <ActivityLayout
      title={<div className={styles.activityTitle}>{activity.title}</div>}
      backTo={backTo}
    >
      <div className={styles.layout}>
        <section className={styles.viewerColumn}>
          <header className={styles.viewerHeader}>
            <h2 className={styles.sectionTitle}>Presentación interactiva</h2>
            {resourceUrl ? (
              <div className={styles.viewerActions}>
                <button
                  className={styles.secondaryButton}
                  onClick={requestFullscreen}
                  type="button"
                >
                  Pantalla completa
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={openInNewTab}
                  type="button"
                >
                  Abrir en pestaña nueva
                </button>
              </div>
            ) : null}
          </header>
          <div className={styles.iframeWrapper}>
            {resourceUrl ? (
              <iframe
                ref={iframeRef}
                src={resourceUrl}
                title={activity.title}
                className={styles.presentationIframe}
                frameBorder="0"
                allowFullScreen
              />
            ) : (
              <div className={styles.emptyState}>
                No se adjuntó ninguna presentación para esta actividad.
              </div>
            )}
          </div>
        </section>
        <aside className={styles.infoColumn}>
          <div className={styles.tipCard}>
            <img
              src="/Gifs/Pixel Owl Gif.gif"
              alt="Sugerencia"
              className={styles.tipIcon}
              loading="lazy"
            />
            <p className={styles.tipText}>{description}</p>
          </div>
          <div className={styles.tipCard}>
            <img
              src="/Gifs/Fuegito.gif"
              alt="Consejo"
              className={styles.tipIcon}
              loading="lazy"
            />
            <p className={styles.tipText}>
              Usa las flechas del teclado para avanzar rápidamente y no olvides pausar para
              tomar apuntes.
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

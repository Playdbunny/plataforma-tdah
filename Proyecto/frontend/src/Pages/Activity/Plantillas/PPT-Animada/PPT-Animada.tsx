import { useRef } from "react";
import ActivityLayout from "../../../../Layouts/ActivityLayout/ActivityLayout";
import type { ActivityTemplateProps } from "../shared";
import { resolveResourceUrl } from "../shared";
import styles from "./PPT-Animada.module.css";

export default function PPTAnimada({ activity, backTo }: ActivityTemplateProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const resourceUrl = resolveResourceUrl(activity.config);

  return (
    <ActivityLayout
      title={<div className={styles.activityTitle}>{activity.title}</div>}
      backTo={backTo}
    >
      <div className={styles.containerRow}>
        <div className={styles.panelAzul}>
          <div className={styles.presentationContainer}>
            <button
              className={styles.fullscreenBtn}
              onClick={() => {
                const iframe = iframeRef.current;
                if (!iframe) return;
                const requestFullscreen =
                  iframe.requestFullscreen ||
                  (iframe as any).webkitRequestFullscreen ||
                  (iframe as any).mozRequestFullScreen ||
                  (iframe as any).msRequestFullscreen;
                if (requestFullscreen) {
                  requestFullscreen.call(iframe);
                }
              }}
              title="Pantalla completa"
              type="button"
            >
              <img src="/Images/fullscreen.png" alt="Pantalla completa" />
            </button>
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
        </div>
        <div className={styles.panelPixel}>
          <span className={`${styles.corner} ${styles.tl}`} aria-hidden />
          <span className={`${styles.corner} ${styles.tr}`} aria-hidden />
          <span className={`${styles.corner} ${styles.bl}`} aria-hidden />
          <span className={`${styles.corner} ${styles.br}`} aria-hidden />
          <div className={styles.pixelContent}>
            <img
              src="/Gifs/Pixel Owl Gif.gif"
              alt="Pixel Owl"
              className={styles.owlGif}
            />
            <div className={styles.pixelText}>
              {activity.description ??
                "Toma un cuaderno o tu tablet para registrar los puntos clave."}
            </div>
          </div>
        </div>
      </div>
      <div className={styles.finishedBtn}>
        <span className={styles.finishedText}>¡Actividad completada!</span>
        <span className={styles.finishedReward}>+{activity.xpReward ?? 0}</span>
      </div>
    </ActivityLayout>
  );
}

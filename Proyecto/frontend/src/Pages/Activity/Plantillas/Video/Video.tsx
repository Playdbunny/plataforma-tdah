import styles from "./Video.module.css";
import ActivityLayout from "../../../../Layouts/ActivityLayout/ActivityLayout";
import { useState } from "react";

const VideoPage = () => {
  // Simulación: URL del video que vendrá del formulario/subida
  const [videoUrl] = useState("/videos/historia-chile.mp4"); // Cambia por la URL real del video

  return (
    <ActivityLayout title={<span className={styles.videoTitle}>La Historia de chile</span>}>
      <div className={styles.videoBg}>
        <div className={styles.videoContent}>
          <div className={styles.sidePanelGroup}>
            <div className={styles.sidePanel + " " + styles.topPanel}>
              <img src="/Gifs/Fuegito.gif" alt="Fuego" className={styles.panelIcon} />
              <span className={styles.panelText}>
                Terminando el video<br />
                recien se otorgarán tus monedas
              </span>
            </div>
            <div className={styles.sidePanel + " " + styles.bottomPanel}>
              <img src="/Gifs/Pixel Owl Gif.gif" alt="Sombrero" className={styles.panelIcon} />
              <span className={styles.panelText}>
                Como recomendación<br />
                toma un cuaderno<br />
                o tu tablet para<br />
                tus apuntes
              </span>
            </div>
          </div>
          <div className={styles.videoMain}>
            <video
              className={styles.videoPlayer}
              src={videoUrl}
              controls
              poster="/Images/video-poster.png"
            >
              Tu navegador no soporta el video.
            </video>
          </div>
          <button
            className={styles.finishedBtn}
            type="button"
            onClick={() => alert("¡Actividad finalizada!")}
          >
            Finished <img src="/Images/coin.png" alt="Moneda" className={styles.coinIcon} /> +5
          </button>
        </div>
      </div>
    </ActivityLayout>
  );
};

export default VideoPage;

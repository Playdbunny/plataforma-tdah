import styles from "./Video_Quim.module.css";
import ActivityLayout from "../../../../Layouts/ActivityLayout/ActivityLayout";
import { useState } from "react";

function QuimicaVideo() {
    // Simulación: URL del video de química
    const [videoUrl] = useState("/videos/quimica-newton.mp4"); // Cambia por la URL real del video

    return (
        <ActivityLayout title={<span className={styles.videoTitle}>Leyes de Newton en la Química</span>} backTo="/subjects/quimica">
            <div className={styles.videoBg}>
                <div className={styles.videoContent}>
                    <div className={styles.sidePanelGroup}>
                        <div className={styles.sidePanel + " " + styles.topPanel}>
                            <img src="/Gifs/Fuegito.gif" alt="Fuego" className={styles.panelIcon} />
                            <span className={styles.panelText}>
                                Terminando el video<br />
                                se otorgarán tus monedas
                            </span>
                        </div>
                        <div className={styles.sidePanel + " " + styles.bottomPanel}>
                            <img src="/Gifs/Pixel Owl Gif.gif" alt="Pixel Owl" className={styles.panelIcon} />
                            <span className={styles.panelText}>
                                Toma apuntes sobre<br />
                                las leyes de Newton<br />
                                y su relación con la química
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
}

export default QuimicaVideo;

import styles from './PPT-Animada_Quim.module.css';
import { useRef } from 'react';
import ActivityLayout from "../../../../Layouts/ActivityLayout/ActivityLayout";

const PPTAnimadaQuim: React.FC = () => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    return (
        <ActivityLayout title={
            <div className={styles.activityTitle}>
                Leyes de Newton
            </div>
        } backTo="/subjects/quimica">
            <div className={styles.containerRow}>
                <div className={styles.panelAzul}>
                    <div className={styles.presentationContainer}>
                        <button
                            className={styles.fullscreenBtn}
                            onClick={() => {
                                const iframe = iframeRef.current;
                                if (iframe && iframe.requestFullscreen) iframe.requestFullscreen();
                                else if (iframe && (iframe as any).webkitRequestFullscreen) (iframe as any).webkitRequestFullscreen();
                                else if (iframe && (iframe as any).mozRequestFullScreen) (iframe as any).mozRequestFullScreen();
                                else if (iframe && (iframe as any).msRequestFullscreen) (iframe as any).msRequestFullscreen();
                            }}
                            title="Pantalla completa"
                        >
                            <img src="/Images/fullscreen.png" alt="Pantalla completa" />
                        </button>
                        <iframe
                            ref={iframeRef}
                            src="/ruta/a/tu/presentacion-quimica.pdf"
                            title="Presentación Química"
                            className={styles.presentationIframe}
                            frameBorder="0"
                            allowFullScreen
                        ></iframe>
                    </div>
                </div>
                <div className={styles.panelPixel}>
                    <span className={styles.corner + ' ' + styles.tl}></span>
                    <span className={styles.corner + ' ' + styles.tr}></span>
                    <span className={styles.corner + ' ' + styles.bl}></span>
                    <span className={styles.corner + ' ' + styles.br}></span>
                    <div className={styles.pixelContent}>
                        <img
                            src="/Gifs/Pixel Owl Gif.gif"
                            alt="Pixel Owl"
                            className={styles.owlGif}
                        />
                        <div className={styles.pixelText}>
                            Recuerda tomar<br />
                            apuntes sobre<br />
                            las leyes de Newton<br />
                            y su impacto en la química
                        </div>
                    </div>
                </div>
            </div>
        </ActivityLayout>
    );
};

export default PPTAnimadaQuim;

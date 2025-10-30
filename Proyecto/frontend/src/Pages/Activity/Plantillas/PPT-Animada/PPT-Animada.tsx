
import styles from './PPT-Animada.module.css';
import { useRef } from 'react';
import ActivityLayout from "../../../../Layouts/ActivityLayout/ActivityLayout";


const PPTAnimada: React.FC = () => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    return (
        <ActivityLayout title={
            <div className={styles.activityTitle}>
                La crisis de la<br />civilización occidental
                
            </div>
        } backTo="/subjects/historia">
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
                            src="/ruta/a/tu/presentacion.pdf"
                            title="Presentación"
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
                            Como<br />
                            recomendacion<br />
                            toma un cuaderno<br />
                            o tu tablet para<br />
                            tus apuntes
                        </div>
                    </div>
                </div>
            </div>
                            <button
                                className={styles.finishedBtn}
                                type="button"
                                onClick={() => alert('¡Actividad finalizada!')}
                            >
                                <span className={styles.finishedText}>Finished</span>
                                <span className={styles.finishedReward}>
                                    <img src="/Images/coin.png" alt="Moneda" className={styles.coinIcon} />
                                    +5
                                </span>
                            </button>
        </ActivityLayout>
    );
};

export default PPTAnimada;

import { Link } from "react-router-dom";
import styles from './Chemistry.module.css';
import { useState, useRef, useEffect } from 'react';

export default function ChemistryPage() {
    const carouselRef = useRef<HTMLDivElement>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const items = ["Tema 1", "Tema 2", "Tema 3", "Tema 4", "Tema 5", "Tema 6"];

    const handleNext = () => {
        if (carouselRef.current) {
            const { scrollLeft, clientWidth } = carouselRef.current;
            carouselRef.current.scrollLeft = scrollLeft + clientWidth;
        }
    };

    useEffect(() => {
        const carouselElement = carouselRef.current;
        if (!carouselElement) return;

        const handleScroll = () => {
            const scrollPosition = carouselElement.scrollLeft;
            const itemWidth = carouselElement.children[0].clientWidth + 15; // +15 por el gap
            const newIndex = Math.round(scrollPosition / itemWidth);
            setCurrentIndex(newIndex);
        };

        carouselElement.addEventListener('scroll', handleScroll);

        return () => {
            carouselElement.removeEventListener('scroll', handleScroll);
        };
    }, []);

    return (
        <div className={styles.screen}>
            {/* NAV */}
            <div className={styles.navbar}>
                <a className={styles.brand} href="/">###</a>
                <nav className={styles.menu}>
                    <Link to="/">Home</Link>
                    <Link to="/login">Login</Link>
                    <Link to="#progress">Mi progreso</Link>
                    <Link to="/subjects">Materias</Link>
                </nav>
            </div>

            {/* CONTENIDO */}
            <main className={styles.content}>
                <h1 className={styles.title}>Quimica</h1>
                <p className={styles.subtitle}>
                    ¡Bienvenido a la sección de Quimica!
                </p>
                <h2 className={styles.title}>PPT-Animadas</h2>

                {/* CARRUSEL */}
                <div className={styles.carousel}>
                    <div className={styles.carouselContent} ref={carouselRef}>
                        {items.map((item, index) => (
                            <Link
                                key={index}
                                to={`/*Modelos_Atomicos/${index + 1}`}
                                className={styles.carouselItem}
                            >
                                {item}
                            </Link>
                        ))}
                    </div>
                    <button className={styles.carouselNavBtn} onClick={handleNext}>
                        &gt;
                    </button>
                </div>

                {/* INDICADORES */}
                <div className={styles.carouselIndicators}>
                    {items.map((_, index) => (
                        <div
                            key={index}
                            className={`${styles.indicator} ${index === currentIndex ? styles.active : ''}`}
                        />
                    ))}
                </div>
            </main>
        </div>
    );
}
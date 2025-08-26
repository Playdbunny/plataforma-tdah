// src/pages/Home.tsx
import React from 'react';
import { Link } from 'react-router-dom'; // Importa Link
import styles from './Home.module.css';
import fondoHome from '../assets/fondo_home.gif';

const Home: React.FC = () => {
  return (
    <div className={styles.screen} style={{ backgroundImage: `url(${fondoHome})` }}>
      <header className={styles.navbar}>
        <div className={styles.brand}>SynapQuest</div>
      </header>

      <main className={styles.hero}>
        <div className={styles.contentContainer}>
          <h1 className={styles.title}>SynapQuest</h1>
          <p className={styles.subtitle}>
            Emprende tu aventura hacia un aprendizaje personalizado para ti!
          </p>
          <div className={styles.buttonsContainer}>
            {/* Usa el componente Link en lugar de button */}
            <Link
              to="/tdah-selection" // La ruta a la que quieres navegar
              className={`${styles.btn} ${styles.btnPrimary}`}
            >
              Iniciar aventura
            </Link>
            
            {/* Si "Continuar aventura" va a la autenticación */}
            <Link
              to="/auth" // La ruta a la página de autenticación
              className={`${styles.btn} ${styles.btnSecondary}`}
            >
              Continuar aventura
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
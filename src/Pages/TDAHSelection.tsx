import React, { useEffect } from 'react';
import { useSearchParams,useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';
import type { TDAHType } from '../stores/appStore';
import styles from './TDAHSelection.module.css';
import fondoHome from '../assets/fondo_home.gif';

const TDAHSelection: React.FC = () => {
  const navigate = useNavigate();
  const setTdahType = useAppStore((s) => s.setTdahType);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const selectedType = searchParams.get('type');
    if (selectedType && (selectedType === 'Inatento' || selectedType === 'Hiperactivo-Impulsivo' || selectedType === 'Combinado')) {
      setTdahType(selectedType);
      navigate('/register');
    }
  }, [searchParams, setTdahType, navigate]);

  return (
    <div className={styles.screen}style={{ backgroundImage: `url(${fondoHome})` }}>
      <main className={styles.container}>
        <h1 className={styles.title}>ELIGE TU TIPO</h1>
        <p className={styles.subtitle}>Hay tres tipos de TDAH!</p>

        <div className={styles.buttonsGrid}>
          <Link
            to="/tdah-selection?type=Inatento"
            className={`${styles.btn} ${styles.btnInatento}`}
          >
            Inatento
          </Link>
          <Link
            to="/tdah-selection?type=Hiperactivo-Impulsivo"
            className={`${styles.btn} ${styles.btnHiperactivo}`}
          >
            Hiperactivo-Impulsivo
          </Link>
          <Link
            to="/tdah-selection?type=Combinado"
            className={`${styles.btn} ${styles.btnCombinado}`}
          >
            Combinado
          </Link>
        </div>
      </main>
    </div>
  );
};

export default TDAHSelection;
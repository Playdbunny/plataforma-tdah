import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../Components/Navbar/Navbar"; // Ajusta la ruta si es necesario
import styles from "./ActivityLayout.module.css";

interface ActivityLayoutProps {
  title: React.ReactNode;
  leftPanel?: React.ReactNode;
  children?: React.ReactNode;
  pagination?: React.ReactNode;
  finished?: React.ReactNode;
  backTo?: string; // Nueva prop para la ruta de regreso
}

export default function ActivityLayout({ title, leftPanel, children, pagination, finished, backTo }: ActivityLayoutProps) {
  const navigate = useNavigate();
  const target = backTo || "/subjects";
  return (
    <div className={styles.bg}>
      <Navbar items={[
        { label: "Materias", to: "/subjects" },
      ]} />
      <div className={styles.arrowContainer}>
        <div className={styles.topRow}>
          <button className={styles.backBtn} onClick={() => navigate(target)} aria-label="Volver">
            {/* Flecha pixel-art SVG */}
            <svg className={styles.pixelArrow} width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="14" width="20" height="4" fill="#fff"/>
              <rect x="2" y="14" width="10" height="4" fill="#d1d1d1"/>
              <rect x="2" y="10" width="8" height="12" fill="#fff"/>
              <rect x="2" y="10" width="4" height="12" fill="#d1d1d1"/>
            </svg>
          </button>
          <div className={styles.title}>{title}</div>
        </div>
        <div className={styles.arrowLine}></div>
      </div>
      <div className={styles.main}>
        {leftPanel && (
          <div className={styles.panel}>
            {leftPanel}
          </div>
        )}
        {children}
        {pagination && <div className={styles.pagination}>{pagination}</div>}
        {finished && <div className={styles.finished}>{finished}</div>}
      </div>
    </div>
  );
}
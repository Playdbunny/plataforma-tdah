import React from "react";
import Navbar from "../../Components/Navbar/Navbar"; // Ajusta la ruta si es necesario
import styles from "./ActivityLayoutInfografia.module.css";


import { useNavigate } from "react-router-dom";

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
  return (
    <div className={styles.bg}>
      <Navbar items={[
        { label: "Materias", to: "/subjects" },
      ]}/>
      <div className={styles.main}>
        {backTo && (
          <button className={styles.backButton} onClick={() => navigate(backTo)} aria-label="Volver">
            ← Volver
          </button>
        )}
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
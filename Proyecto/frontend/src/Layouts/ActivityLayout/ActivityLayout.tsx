import React from "react";
import Navbar from "../../Components/Navbar/Navbar"; // Ajusta la ruta si es necesario
import styles from "./ActivityLayout.module.css";

interface ActivityLayoutProps {
  title: React.ReactNode;
  leftPanel?: React.ReactNode;
  children?: React.ReactNode;
  pagination?: React.ReactNode;
  finished?: React.ReactNode;
}

export default function ActivityLayout({ title, leftPanel, children, pagination, finished }: ActivityLayoutProps) {
  return (
    <div className={styles.bg}>
      <Navbar />
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
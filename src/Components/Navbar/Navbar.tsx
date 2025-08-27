import { Link } from "react-router-dom";
import styles from "./Navbar.module.css";

type NavbarProps = {
  /** Si es true, muestra solo la marca (para el Home). */
  homeOnly?: boolean;
};

export default function Navbar({ homeOnly = true }: NavbarProps) {
  return (
    <header className={styles.navbar} role="banner">
      <div className={styles.inner}>
        <Link to="/" className={styles.brand} aria-label="Ir al inicio">
          <img
            src="/public/Logo.png"       // ruta al logo
            alt="SynapQuest logo"
            className={styles.logoSlot}
          />
          <span className={styles.brandText}>SynapQuest</span>
        </Link>

        {/* Si en el futuro quieres un menú aquí, se agrega cuando homeOnly = false */}
        {!homeOnly && (
          <nav className={styles.menu} aria-label="principal">
            {/* Ejemplos futuros:
            <Link to="/learn">Aprender</Link>
            <Link to="/subjects">Materias</Link>
            */}
          </nav>
        )}
      </div>
    </header>
  );
}

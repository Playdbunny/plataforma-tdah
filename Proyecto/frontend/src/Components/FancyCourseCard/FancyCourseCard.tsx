// ─────────────────────────────────────────────────────────────
// FancyCourseCard.tsx
// Card estilo "Codédex-like":
//  • Banner 16:9 arriba (imagen obligatoria).
//  • Eyebrow "COURSE X", título y descripción (clamp con elipsis).
//  • Borde fino con acentos pixel en esquinas y doble línea inferior.
//  • Elevación/shine sutil al hover + parallax del banner.
//  • Envoltura con <a> o <Link> para que toda la card sea clickeable.
// ─────────────────────────────────────────────────────────────

import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import styles from "./FancyCourseCard.module.css";

type Props = {
  /** Ruta a la que navega la card completa */
  to: string;
  /** Texto pequeño superior (ej: "COURSE 1") */
  eyebrow?: string;
  /** Título visible del curso */
  title: string;
  /** Descripción (se trunca con elipsis) */
  description?: string;
  /** URL del banner (ideal 16:9). Pon tus PNGs en /public/assets/courses/ */
  bannerSrc: string;
  /** Contenido opcional al final (por ejemplo "Ver contenido →") */
  footer?: ReactNode;
  /** Si quieres forzar aria-label del enlace (accesibilidad) */
  ariaLabel?: string;
};

export default function FancyCourseCard({
  to,
  eyebrow = "COURSE",
  title,
  description,
  bannerSrc,
  footer,
  ariaLabel,
}: Props) {
  return (
    // Envolvemos TODO con Link para que sea accesible con teclado/lectores
    <Link
      to={to}
      className={styles.card}
      aria-label={ariaLabel ?? `Abrir curso ${title}`}
    >
      {/* Banner superior con parallax suave al hover */}
      <div className={styles.banner} aria-hidden="true">
        <img src={bannerSrc} alt="" />
      </div>

      {/* Cuerpo oscuro con textos */}
      <div className={styles.body}>
        <small className={styles.eyebrow}>{eyebrow}</small>
        <h3 className={styles.title}>{title}</h3>
        {description && <p className={styles.desc}>{description}</p>}

        {/* Footer opcional (CTA, etc.) */}
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </Link>
  );
}

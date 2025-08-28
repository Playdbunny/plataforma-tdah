// ─────────────────────────────────────────────────────────────────────────────
// Navbar.tsx
// Barra de navegación fija con:
//  - Marca SIEMPRE visible (logo + nombre) a la izquierda.
//  - Menú opcional (links) que solo aparece si se pasan por props.
//  - Versión móvil con hamburguesa (se anima a "X").
//  - Accesible (aria-*), cierra el menú al navegar.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { Link } from "react-router-dom";
import styles from "./Navbar.module.css";

// 🔹 Tipo para cada ítem del menú (texto y ruta interna)
export type NavItem = { label: string; to: string };

// 🔹 Props del Navbar
type NavbarProps = {
  /**
   * Si es true, oculta el menú y deja solo la marca (ideal para Home/Login/Register).
   * Por compatibilidad con tu código original, mantiene el mismo nombre y comportamiento.
   * Si quieres mostrar menú, envía homeOnly={false} + la prop `items`.
   */
  homeOnly?: boolean;

  /**
   * Lista opcional de enlaces del menú (se muestran a la derecha).
   * Si no envías `items` o si `homeOnly` es true, NO se muestran enlaces.
   */
  items?: NavItem[];
};

export default function Navbar({
  homeOnly = true,
  items = [],
}: NavbarProps) {
  // Estado que controla si el menú móvil está abierto o cerrado
  const [open, setOpen] = useState(false);

  // Cierra el menú móvil cuando se navega a otra ruta
  const handleNavigate = () => setOpen(false);

  // ¿Debemos mostrar el menú? (solo si NO es "homeOnly" y hay items)
  const showMenu = !homeOnly && items.length > 0;

  return (
    // role="banner" describe semánticamente que es un encabezado de sitio
    <header className={styles.navbar} role="banner">
      <div className={styles.inner}>
        {/* ───────────────────────
            MARCA (SIEMPRE visible)
           ─────────────────────── */}
        <Link to="/" className={styles.brand} aria-label="Ir al inicio" onClick={handleNavigate}>
          {/*
            ⚠️ IMPORTANTE:
            - Si el archivo está en /public/Logo.png, la ruta correcta en React es "/Logo.png"
              (NO uses "/public/Logo.png" dentro de src).
          */}
          <img
            src="/Logo.png"                // ← ruta correcta si el archivo está en /public
            alt="SynapQuest logo"
            className={styles.logoSlot}
          />
          <span className={styles.brandText}>SynapQuest</span>
        </Link>

        {/* ─────────────────────────────
            BOTÓN HAMBURGUESA (solo móvil)
            - Solo se renderiza si hay menú que mostrar.
           ───────────────────────────── */}
        {showMenu && (
          <button
            className={`${styles.burger} ${open ? styles.burgerOpen : ""}`}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            aria-controls="navbar-menu-mobile"
            onClick={() => setOpen((v) => !v)}          // Alterna abierto/cerrado
          >
            {/* 3 líneas que forman la hamburguesa / X (se animan con CSS) */}
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
        )}

        {/* ─────────────────────────────
            MENÚ DESKTOP (links en fila)
            - Solo se muestra cuando hay items y homeOnly=false.
            - En móvil se oculta con media query.
           ───────────────────────────── */}
        {showMenu && (
          <nav className={styles.menu} aria-label="Navegación principal (desktop)">
            {items.map((it) => (
              <Link key={it.to} to={it.to} onClick={handleNavigate}>
                {it.label}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {/* ─────────────────────────────
          MENÚ MÓVIL (desplegable bajo el header)
          - Se controla con `open`.
          - En desktop se oculta por media query.
         ───────────────────────────── */}
      {showMenu && (
        <nav
          id="navbar-menu-mobile"
          className={`${styles.menuMobile} ${open ? styles.menuMobileOpen : ""}`}
          aria-label="Navegación principal (móvil)"
        >
          {items.map((it) => (
            <Link key={it.to} to={it.to} onClick={handleNavigate}>
              {it.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

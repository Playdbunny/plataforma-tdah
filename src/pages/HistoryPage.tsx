import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import styles from "./Math.module.css"; // o "./Subject.module.css"
import { useAppStore } from "../stores/appStore";

export default function HistoryPage() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const tdahType = useAppStore?.((s) => s.tdahType) ?? null;

  const items = [
    { title: "Tema 1", label: "#####" },
    { title: "Tema 2", label: "#####" },
    { title: "Tema 3", label: "#####" },
    { title: "Tema 4", label: "#####" },
    { title: "Tema 5", label: "#####" },
    { title: "Tema 6", label: "#####" },
  ];

  const handleNext = () => {
    const el = carouselRef.current;
    if (!el) return;
    const child = el.children[0] as HTMLElement | undefined;
    if (!child) return;
    const gap = 16;
    const itemWidth = child.clientWidth + gap;
    el.scrollTo({ left: el.scrollLeft + itemWidth, behavior: "smooth" });
  };

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const onScroll = () => {
      const child = el.children[0] as HTMLElement | undefined;
      if (!child) return;
      const gap = 16;
      const itemWidth = child.clientWidth + gap;
      const idx = Math.round(el.scrollLeft / itemWidth);
      setCurrentIndex(Math.min(Math.max(idx, 0), items.length - 1));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [items.length]);

  return (
    <div className={styles.screen}>
      <div className={styles.topRibbon}>
        <div className={styles.ribbonLeft}>{tdahType ? `TDAH ${tdahType}` : "TDAH Inatento"}</div>
        <div className={styles.coins}><span className={styles.coinIcon}>🪙</span><span>0</span></div>
      </div>

      <div className={styles.navbar}>
        <a className={styles.brand} href="/">###</a>
        <nav className={styles.menu}>
          <Link to="/">Inicio</Link>
          <Link to="/progress">Mi progreso</Link>
          <Link to="/subjects">Aprendizaje</Link>
        </nav>
      </div>

      <main className={styles.content}>
        <h1 className={styles.pageTitle}>Historia</h1>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Líneas de tiempo</h2>

          <div className={styles.track}>
            <div className={styles.carouselContent} ref={carouselRef}>
              {items.map((it, i) => (
                <div key={i} className={styles.itemWrap}>
                  <div className={styles.pill}>{it.title}</div>
                  <div className={styles.caption}>{it.label}</div>
                </div>
              ))}
            </div>
            
          </div>

          <div className={styles.indicators}>
            {items.map((_, i) => (
              <button
                key={i}
                className={`${styles.dot} ${i === currentIndex ? styles.active : ""}`}
                onClick={() => {
                  const el = carouselRef.current;
                  if (!el) return;
                  const child = el.children[0] as HTMLElement | undefined;
                  if (!child) return;
                  const gap = 16;
                  const itemWidth = child.clientWidth + gap;
                  el.scrollTo({ left: i * itemWidth, behavior: "smooth" });
                }}
                aria-label={`Ir al elemento ${i + 1}`}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

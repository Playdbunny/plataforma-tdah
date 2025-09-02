import styles from "./CoinsBadge.module.css";
import { useAppStore } from "../../stores/appStore";

type CoinsBadgeProps = {
  compact?: boolean;        // tamaño chico (navbar)
  showZero?: boolean;       // si no hay user o coins=0, ¿mostrar?
  onClick?: () => void;     // opcional: abre modal/tienda
};

export default function CoinsBadge({ compact = true, showZero = false, onClick }: CoinsBadgeProps) {
  const user   = useAppStore((s:any) => s.user);
  const coins  = user?.coins ?? 0;
  const hidden = !user && !showZero;

  if (hidden) return null;

  return (
    <button
      type="button"
      className={`${styles.badge} ${compact ? styles.compact : styles.normal}`}
      onClick={onClick}
      title={`${coins} monedas`}
      aria-label={`${coins} monedas`}
    >
      {/* Icono SVG (pixel-coin simple) */}
      <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12h8M9 8h6M9 16h6" />
      </svg>
      <span className={styles.value}>{coins}</span>
    </button>
  );
}

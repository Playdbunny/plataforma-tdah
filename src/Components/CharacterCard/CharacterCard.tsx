import styles from "./CharacterCard.module.css"; // 👈 FALTABA ESTA IMPORTACIÓN

type Rarity = "common" | "rare" | "epic" | "legendary";

type CharacterCardProps = {
  id: string;
  name: string;
  sprite: string;
  selected?: boolean;
  locked?: boolean;
  price?: number;
  rarity?: Rarity;                 // por defecto abajo: "common"
  onSelect?: (id: string) => void;
  onUnlock?: (id: string) => void;
};

export default function CharacterCard({
  id,
  name,
  sprite,
  selected = false,
  locked = false,
  price,
  rarity = "common",
  onSelect,
  onUnlock,
}: CharacterCardProps) {
  const classNames = [
    styles.card,
    selected ? styles.selected : "",
    locked ? styles.locked : "",
    styles[rarity],                // 👈 clase según rareza
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classNames}
      onClick={() => !locked && onSelect?.(id)}
      aria-pressed={selected}
      aria-label={locked ? `${name} bloqueado` : `Seleccionar ${name}`}
    >
      {/* Badge rareza */}
      <span className={styles.rarityBadge}>{rarity}</span>

      <img className={styles.sprite} src={sprite} alt={name} />
      <div className={styles.name}>{name}</div>

      {locked && (
        <div className={styles.lockOverlay} aria-hidden>
          <div className={styles.lockBadge}>
            🔒 {price ?? 0} monedas
          </div>
          <button
            type="button"
            className={styles.unlockBtn}
            onClick={(e) => {
              e.stopPropagation();
              onUnlock?.(id);
            }}
          >
            Desbloquear
          </button>
        </div>
      )}
    </button>
  );
}


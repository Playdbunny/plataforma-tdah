import styles from "./XPBar.module.css";

type XPBarProps = {
  currentXP: number;
  requiredXP: number;
};

export default function XPBar({ currentXP, requiredXP }: XPBarProps) {
  const progress = Math.min((currentXP / requiredXP) * 100, 100);

  return (
    <div className={styles.barWrapper}>
      <div className={styles.bar}>
        <div className={styles.fill} style={{ width: `${progress}%` }} />
        <span className={styles.label}>
          {currentXP} / {requiredXP} XP
        </span>
      </div>
    </div>
  );
}

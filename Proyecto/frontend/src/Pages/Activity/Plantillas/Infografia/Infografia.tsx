import { useMemo, useState } from "react";
import ActivityLayoutInfografia from "../../../../Layouts/ActivityLayout/ActivityLayoutInfografia";
import styles from "./Infografia.module.css";
import type { ActivityTemplateProps } from "../shared";
import { extractQuestions, resolveResourceUrl } from "../shared";

const FALLBACK_QUESTIONS = [
  {
    question: "Explora la infografía y selecciona la afirmación correcta.",
    hint: "Observa los datos destacados.",
    options: [
      "La infografía resume la idea principal.",
      "La infografía trata sobre un tema distinto.",
      "La infografía no contiene texto.",
    ],
  },
  {
    question: "¿Cuál es el concepto principal?",
    hint: "Busca palabras resaltadas.",
    options: [
      "Se explica un proceso histórico.",
      "Se detalla una receta.",
      "Se presenta un listado deportivo.",
    ],
  },
];

function normalizeQuestions(raw: any[]): typeof FALLBACK_QUESTIONS {
  if (!Array.isArray(raw) || raw.length === 0) return FALLBACK_QUESTIONS;
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const question = typeof entry.question === "string" ? entry.question : null;
      const hint = typeof entry.hint === "string" ? entry.hint : null;
      const rawOptions = (entry as { options?: unknown }).options;
      const options = Array.isArray(rawOptions)
        ? rawOptions.filter((opt): opt is string => typeof opt === "string")
        : null;
      if (!question || !options || options.length === 0) return null;
      return {
        question,
        hint: hint ?? "Piensa en lo que viste en la infografía.",
        options,
      };
    })
    .filter((item): item is typeof FALLBACK_QUESTIONS[number] => Boolean(item));
}

export default function Infografia({ activity, backTo }: ActivityTemplateProps) {
  const [page, setPage] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const questions = useMemo(() => normalizeQuestions(extractQuestions(activity.config)), [
    activity.config,
  ]);

  const totalQuestions = questions.length;
  const safeIndex = Math.min(page, totalQuestions - 1);
  const currentQuestion = questions[safeIndex];
  const progressPercent = ((safeIndex + 1) / totalQuestions) * 100;

  const imageUrl =
    resolveResourceUrl(activity.config) ??
    activity.bannerUrl ??
    "/Images/infografia-placeholder.png";

  const openImage = () => {
    if (!imageUrl) return;
    window.open(imageUrl, "_blank", "noopener,noreferrer");
  };

  const handlePrevious = () => {
    setSelectedOption(null);
    setPage((value) => Math.max(0, value - 1));
  };

  const handleNext = () => {
    setSelectedOption(null);
    setPage((value) => Math.min(totalQuestions - 1, value + 1));
  };

  return (
    <ActivityLayoutInfografia title={activity.title} backTo={backTo}>
      <div className={styles.layout}>
        <section className={styles.imagePanel}>
          <header className={styles.imageHeader}>
            <h2 className={styles.panelTitle}>Infografía</h2>
            <div className={styles.imageActions}>
              <button
                className={styles.secondaryButton}
                onClick={openImage}
                type="button"
              >
                Abrir en pestaña nueva
              </button>
              <a className={styles.secondaryButton} href={imageUrl} download>
                Descargar imagen
              </a>
            </div>
          </header>
          <div className={styles.imageWrapper}>
            <img
              src={imageUrl}
              alt={`Infografía de ${activity.title}`}
              className={styles.infografiaImg}
              loading="lazy"
            />
          </div>
          <p className={styles.imageHint}>
            Sugerencia: amplía la imagen con el zoom de tu navegador para observar
            los detalles.
          </p>
        </section>
        <section className={styles.questionPanel}>
          <header className={styles.questionHeader}>
            <h1 className={styles.activityTitle}>{activity.title}</h1>
            {activity.description ? (
              <p className={styles.description}>{activity.description}</p>
            ) : null}
            <div className={styles.progress}>
              <span className={styles.progressLabel}>
                Pregunta {safeIndex + 1} de {totalQuestions}
              </span>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressValue}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </header>
          <div className={styles.questionBody}>
            <p className={styles.questionText}>{currentQuestion.question}</p>
            {currentQuestion.hint ? (
              <p className={styles.hint}>{currentQuestion.hint}</p>
            ) : null}
            <div className={styles.optionsGrid}>
              {currentQuestion.options.map((option, index) => (
                <button
                  key={`option-${index}`}
                  className={styles.optionButton}
                  data-selected={selectedOption === index}
                  onClick={() => setSelectedOption(index)}
                  type="button"
                  aria-pressed={selectedOption === index}
                >
                  <span className={styles.optionBadge}>
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className={styles.optionCopy}>{option}</span>
                </button>
              ))}
            </div>
          </div>
          <footer className={styles.controls}>
            <button
              className={styles.primaryButton}
              onClick={handlePrevious}
              disabled={safeIndex === 0}
              type="button"
            >
              Anterior
            </button>
            <span className={styles.paginationInfo}>
              Página {safeIndex + 1} de {totalQuestions}
            </span>
            <button
              className={styles.primaryButton}
              onClick={handleNext}
              disabled={safeIndex >= totalQuestions - 1}
              type="button"
            >
              Siguiente
            </button>
            <div className={styles.rewardBadge}>
              <span className={styles.rewardLabel}>Monedas</span>
              <span className={styles.rewardValue}>+{activity.xpReward ?? 0}</span>
            </div>
          </footer>
        </section>
      </div>
    </ActivityLayoutInfografia>
  );
}

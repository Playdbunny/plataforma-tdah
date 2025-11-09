import { useMemo, useState } from "react";
import ActivityLayout from "../../../../Layouts/ActivityLayout/ActivityLayout";
import type { ActivityTemplateProps } from "../shared";
import { extractQuestions } from "../shared";
import styles from "./Quiz.module.css";

const FALLBACK_QUESTIONS = [
  {
    text: "Selecciona la opción correcta relacionada con la temática.",
    options: [
      "Esta opción es correcta.",
      "Esta opción no aplica.",
      "Esta opción brinda un ejemplo.",
      "Esta opción es distractora.",
    ],
  },
  {
    text: "Analiza la información presentada y elige la alternativa adecuada.",
    options: [
      "Describe el concepto central.",
      "Es un detalle complementario.",
      "Propone una comparación.",
      "No corresponde al tema.",
    ],
  },
];

function normalizeQuestions(raw: any[]): typeof FALLBACK_QUESTIONS {
  if (!Array.isArray(raw) || raw.length === 0) return FALLBACK_QUESTIONS;
  const normalized = raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const text = typeof entry.text === "string" ? entry.text : entry.question;
      const rawOptions = (entry as { options?: unknown }).options;
      const options = Array.isArray(rawOptions)
        ? rawOptions.filter((opt): opt is string => typeof opt === "string")
        : null;
      if (typeof text !== "string" || !options || options.length < 2) return null;
      return { text, options };
    })
    .filter((item): item is typeof FALLBACK_QUESTIONS[number] => Boolean(item));
  return normalized.length > 0 ? normalized : FALLBACK_QUESTIONS;
}

export default function QuizTemplate({ activity, backTo }: ActivityTemplateProps) {
  const questions = useMemo(
    () => normalizeQuestions(extractQuestions(activity.config)),
    [activity.config],
  );

  const [page, setPage] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const totalPages = questions.length;
  const safePage = Math.min(page, totalPages - 1);
  const question = questions[safePage];
  const progressPercent = ((safePage + 1) / totalPages) * 100;

  const handlePrevious = () => {
    setSelectedOption(null);
    setPage((value) => Math.max(0, value - 1));
  };

  const handleNext = () => {
    setSelectedOption(null);
    setPage((value) => Math.min(totalPages - 1, value + 1));
  };

  return (
    <ActivityLayout
      title={<span className={styles.quizTitle}>{activity.title}</span>}
      backTo={backTo}
    >
      <div className={styles.quizWrapper}>
        <header className={styles.quizHeader}>
          <span className={styles.quizCounter}>
            Pregunta {safePage + 1} de {totalPages}
          </span>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressValue}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className={styles.questionText}>{question.text}</p>
          {activity.description ? (
            <p className={styles.quizHint}>{activity.description}</p>
          ) : null}
        </header>
        <div className={styles.optionsGrid}>
          {question.options.map((option, index) => (
            <button
              key={`option-${index}`}
              className={styles.optionButton}
              data-selected={selectedOption === index}
              onClick={() => setSelectedOption(index)}
              type="button"
              aria-pressed={selectedOption === index}
            >
              <span className={styles.optionIndex}>{String.fromCharCode(65 + index)}</span>
              <span className={styles.optionCopy}>{option}</span>
            </button>
          ))}
        </div>
        <footer className={styles.quizFooter}>
          <button
            className={styles.primaryButton}
            onClick={handlePrevious}
            disabled={safePage === 0}
            type="button"
          >
            Anterior
          </button>
          <button
            className={styles.primaryButton}
            onClick={handleNext}
            disabled={safePage >= totalPages - 1}
            type="button"
          >
            Siguiente
          </button>
          <div className={styles.rewardBadge}>
            <span className={styles.rewardLabel}>Monedas</span>
            <span className={styles.rewardValue}>+{activity.xpReward ?? 0}</span>
          </div>
        </footer>
      </div>
    </ActivityLayout>
  );
}

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

  const safePage = Math.min(page, questions.length - 1);
  const question = questions[safePage];
  const totalPages = questions.length;

  const leftOptions = question.options.filter((_, index) => index % 2 === 0);
  const rightOptions = question.options.filter((_, index) => index % 2 === 1);

  const renderOption = (option: string, actualIndex: number) => (
    <button
      key={`option-${actualIndex}`}
      className={`${styles.optionBtn} ${
        selectedOption === actualIndex ? styles.optionSelected : ""
      }`}
      type="button"
      onClick={() => setSelectedOption(actualIndex)}
      aria-pressed={selectedOption === actualIndex}
    >
      <img src="/Images/opciones.png" alt="Opción" className={styles.optionFrame} />
      <span className={styles.optionText}>{option}</span>
    </button>
  );

  return (
    <ActivityLayout
      title={<span className={styles.quizTitle}>{activity.title}</span>}
      backTo={backTo}
    >
      <div className={styles.quizBg}>
        <div className={styles.quizContent}>
          <div className={styles.scrollRow}>
            <div className={styles.optionCol}>
              {leftOptions.map((option, index) =>
                renderOption(option, index * 2),
              )}
            </div>
            <div className={styles.scrollContainer}>
              <img src="/Images/Pergamino.png" alt="Pergamino" className={styles.scrollImg} />
              <div className={styles.scrollText}>{question.text}</div>
            </div>
            <div className={styles.optionCol}>
              {rightOptions.map((option, index) =>
                renderOption(option, index * 2 + 1),
              )}
            </div>
          </div>
          <div className={styles.quizFooter}>
            <button
              className={styles.footerNav}
              onClick={() => {
                setSelectedOption(null);
                setPage((value) => Math.max(0, value - 1));
              }}
              disabled={safePage === 0}
              aria-disabled={safePage === 0 ? "true" : "false"}
              type="button"
            >
              Anterior
            </button>
            <span className={styles.footerPage}>
              Página <b>{safePage + 1}</b> de {totalPages}
            </span>
            <button
              className={styles.footerNav}
              onClick={() => {
                setSelectedOption(null);
                setPage((value) => Math.min(totalPages - 1, value + 1));
              }}
              disabled={safePage >= totalPages - 1}
              aria-disabled={safePage >= totalPages - 1 ? "true" : "false"}
              type="button"
            >
              Siguiente
            </button>
            <div className={styles.finishedBtn}>
              <span>Monedas</span>
              <span className={styles.coinValue}>+{activity.xpReward ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </ActivityLayout>
  );
}

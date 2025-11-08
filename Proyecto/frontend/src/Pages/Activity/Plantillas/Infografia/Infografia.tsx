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

  const currentQuestion = questions[Math.min(page, questions.length - 1)];

  const imageUrl =
    resolveResourceUrl(activity.config) ??
    activity.bannerUrl ??
    "/Images/infografia-placeholder.png";

  return (
    <ActivityLayoutInfografia title={activity.title} backTo={backTo}>
      <div className={styles.flexRow}>
        <div className={styles.panelAzul1}>
          <div className={styles.panelTopControls}>
            <div className={styles.zoomControls}>
              <span className={styles.zoomInfo}>Revisa cada detalle</span>
            </div>
          </div>
          <div className={styles.infografiaContainer}>
            <img
              src={imageUrl}
              alt={`Infografía de ${activity.title}`}
              className={styles.infografiaImg}
            />
          </div>
        </div>
        <div className={styles.panelAzul2}>
          <div className={styles.activityTitle}>{activity.title}</div>
          {activity.description ? (
            <p className={styles.hint}>{activity.description}</p>
          ) : null}
          <div className={styles.question}>{currentQuestion.question}</div>
          {currentQuestion.hint ? (
            <span className={styles.hint}>{currentQuestion.hint}</span>
          ) : null}
          <div className={styles.containeroptions}>
            {currentQuestion.options.map((option, index) => (
              <button
                key={`opt-${index}`}
                className={`${
                  styles[`option${index + 1}` as keyof typeof styles] ?? styles.option1
                }${selectedOption === index ? ` ${styles.selected}` : ""}`}
                onClick={() => setSelectedOption(index)}
                type="button"
              >
                <span className={styles.optionLetter}>{String.fromCharCode(65 + index)}</span>
                {option}
              </button>
            ))}
          </div>
          <div className={styles.paginationContainer}>
            <button
              className={styles.paginationBtn}
              onClick={() => {
                setSelectedOption(null);
                setPage((value) => Math.max(0, value - 1));
              }}
              disabled={page === 0}
              type="button"
            >
              Anterior
            </button>
            <span className={styles.paginationInfo}>
              Página {Math.min(page, questions.length - 1) + 1} de {questions.length}
            </span>
            <button
              className={styles.paginationBtn}
              onClick={() => {
                setSelectedOption(null);
                setPage((value) => Math.min(questions.length - 1, value + 1));
              }}
              disabled={page >= questions.length - 1}
              type="button"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </ActivityLayoutInfografia>
  );
}

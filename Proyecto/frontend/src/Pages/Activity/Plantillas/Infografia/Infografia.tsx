import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ActivityLayoutInfografia from "../../../../Layouts/ActivityLayout/ActivityLayoutInfografia";
import styles from "./Infografia.module.css";
import type { ActivityTemplateProps } from "../shared";
import { extractQuestions, resolveResourceUrl } from "../shared";
import { useActivityCompletion } from "../useActivityCompletion";
import type { ActivityResultState } from "../../Result/types";

const FALLBACK_QUESTIONS = [
  {
    question: "Explora la infografía y selecciona la afirmación correcta.",
    hint: "Observa los datos destacados.",
    options: [
      "La infografía resume la idea principal.",
      "La infografía trata sobre un tema distinto.",
      "La infografía no contiene texto.",
    ],
    correctIndex: 0,
  },
  {
    question: "¿Cuál es el concepto principal?",
    hint: "Busca palabras resaltadas.",
    options: [
      "Se explica un proceso histórico.",
      "Se detalla una receta.",
      "Se presenta un listado deportivo.",
    ],
    correctIndex: 0,
  },
];

type NormalizedQuestion = typeof FALLBACK_QUESTIONS[number];

function resolveCorrectIndex(entry: Record<string, unknown>, options: string[]): number {
  const numericKeys = ["correctIndex", "correct", "answerIndex", "correctAnswer"] as const;
  for (const key of numericKeys) {
    const value = entry[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      const bounded = Math.max(0, Math.min(Math.trunc(value), options.length - 1));
      return bounded;
    }
  }

  const stringKeys = ["correctOption", "answer"] as const;
  for (const key of stringKeys) {
    const value = entry[key];
    if (typeof value === "string") {
      const normalized = options.findIndex((option) => option === value);
      if (normalized >= 0) return normalized;
    }
  }

  return 0;
}

function normalizeQuestions(raw: any[]): NormalizedQuestion[] {
  if (!Array.isArray(raw) || raw.length === 0) return FALLBACK_QUESTIONS;
  const normalized = raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const question = typeof entry.question === "string" ? entry.question : null;
      const hint = typeof entry.hint === "string" ? entry.hint : null;
      const rawOptions = (entry as { options?: unknown }).options;
      const options = Array.isArray(rawOptions)
        ? rawOptions.filter((opt): opt is string => typeof opt === "string")
        : null;
      if (!question || !options || options.length === 0) return null;
      const correctIndex = resolveCorrectIndex(entry as Record<string, unknown>, options);
      return {
        question,
        hint: hint ?? "Piensa en lo que viste en la infografía.",
        options,
        correctIndex,
      };
    })
    .filter((item): item is NormalizedQuestion => Boolean(item));

  return normalized.length > 0 ? normalized : FALLBACK_QUESTIONS;
}

export default function Infografia({ activity, backTo }: ActivityTemplateProps) {
  const questions = useMemo(() => normalizeQuestions(extractQuestions(activity.config)), [
    activity.config,
  ]);

  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState<number[]>(() => questions.map(() => -1));
  const [submitting, setSubmitting] = useState(false);
  const { finishActivity, finished, xpReward, coinsReward, awardedXp, awardedCoins } =
    useActivityCompletion(activity);
  const navigate = useNavigate();
  const { subjectId, activitySlug } = useParams<{
    subjectId: string;
    activitySlug: string;
  }>();

  useEffect(() => {
    setPage(0);
    setAnswers(questions.map(() => -1));
  }, [questions]);

  const totalQuestions = questions.length;
  const safeIndex = Math.min(page, totalQuestions - 1);
  const currentQuestion = questions[safeIndex];
  const progressPercent = ((safeIndex + 1) / totalQuestions) * 100;
  const selectedOption = answers[safeIndex] ?? -1;

  const imageUrl =
    resolveResourceUrl(activity.config) ??
    activity.bannerUrl ??
    "/Images/infografia-placeholder.png";

  const openImage = () => {
    if (!imageUrl) return;
    window.open(imageUrl, "_blank", "noopener,noreferrer");
  };

  const handlePrevious = () => {
    setPage((value) => Math.max(0, value - 1));
  };

  const handleNext = () => {
    setPage((value) => Math.min(totalQuestions - 1, value + 1));
  };

  const handleSelect = (optionIndex: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[safeIndex] = optionIndex;
      return next;
    });
  };

  const handleFinish = async () => {
    if (submitting) return;
    const correctCount = questions.reduce((acc, question, index) => {
      return acc + (answers[index] === question.correctIndex ? 1 : 0);
    }, 0);
    const activitySlugValue = activity.slug ?? activitySlug ?? activity.id;
    const subjectPath = activity.subjectSlug
      ? `/subjects/${activity.subjectSlug}`
      : subjectId
      ? `/subjects/${subjectId}`
      : backTo;

    if (!activitySlugValue || !subjectPath?.startsWith("/subjects/")) {
      await finishActivity({
        correctCount,
        totalCount: questions.length,
      });
      navigate(backTo);
      return;
    }

    setSubmitting(true);
    try {
      const summary = await finishActivity({
        correctCount,
        totalCount: questions.length,
      });

      const reviewState: ActivityResultState = {
        activityId: activity.id,
        activityTitle: activity.title,
        backTo,
        subjectSlug: activity.subjectSlug ?? subjectId,
        summary,
        answers: questions.map((question, index) => ({
          prompt: question.question,
          options: question.options,
          correctIndex: question.correctIndex,
          selectedIndex: answers[index] ?? -1,
        })),
      };

      const resultPath = `${subjectPath}/activities/${activitySlugValue}/result`;
      navigate(resultPath, { state: reviewState });
    } finally {
      setSubmitting(false);
    }
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
                  onClick={() => handleSelect(index)}
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
          </footer>
          <div className={styles.completionRow}>
            <button
              className={styles.finishButton}
              onClick={handleFinish}
              type="button"
              disabled={finished || submitting}
            >
              {finished ? "Respuestas enviadas" : submitting ? "Enviando…" : "Enviar respuestas"}
            </button>
            <div className={styles.rewardsRow}>
              <div className={`${styles.rewardBadge} ${styles.xpBadge}`}>
                <span className={styles.rewardLabel}>XP</span>
                <span className={styles.rewardValue}>+{xpReward}</span>
              </div>
              <div className={`${styles.rewardBadge} ${styles.coinsBadge}`}>
                <span className={styles.rewardLabel}>Monedas</span>
                <span className={styles.rewardValue}>+{coinsReward}</span>
              </div>
            </div>
          </div>
          {finished ? (
            <p className={styles.completionMessage}>
              ¡Ganaste <strong>+{awardedXp} XP</strong> y <strong>+{awardedCoins} monedas</strong>!
            </p>
          ) : null}
        </section>
      </div>
    </ActivityLayoutInfografia>
  );
}

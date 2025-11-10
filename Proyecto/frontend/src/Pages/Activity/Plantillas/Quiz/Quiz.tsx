import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ActivityLayout from "../../../../Layouts/ActivityLayout/ActivityLayout";
import type { ActivityTemplateProps } from "../shared";
import { extractQuestions } from "../shared";
import { useActivityCompletion } from "../useActivityCompletion";
import styles from "./Quiz.module.css";
import type { ActivityResultState } from "../../Result/types";

const FALLBACK_QUESTIONS = [
  {
    text: "Selecciona la opción correcta relacionada con la temática.",
    options: [
      "Esta opción es correcta.",
      "Esta opción no aplica.",
      "Esta opción brinda un ejemplo.",
      "Esta opción es distractora.",
    ],
    correctIndex: 0,
  },
  {
    text: "Analiza la información presentada y elige la alternativa adecuada.",
    options: [
      "Describe el concepto central.",
      "Es un detalle complementario.",
      "Propone una comparación.",
      "No corresponde al tema.",
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
      const text = typeof entry.text === "string" ? entry.text : entry.question;
      const rawOptions = (entry as { options?: unknown }).options;
      const options = Array.isArray(rawOptions)
        ? rawOptions.filter((opt): opt is string => typeof opt === "string")
        : null;
      if (typeof text !== "string" || !options || options.length < 2) return null;
      const correctIndex = resolveCorrectIndex(entry as Record<string, unknown>, options);
      return { text, options, correctIndex };
    })
    .filter((item): item is NormalizedQuestion => Boolean(item));
  return normalized.length > 0 ? normalized : FALLBACK_QUESTIONS;
}

export default function QuizTemplate({ activity, backTo }: ActivityTemplateProps) {
  const questions = useMemo(
    () => normalizeQuestions(extractQuestions(activity.config)),
    [activity.config],
  );

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

  const totalPages = questions.length;
  const safePage = Math.min(page, totalPages - 1);
  const question = questions[safePage];
  const progressPercent = ((safePage + 1) / totalPages) * 100;
  const selectedOption = answers[safePage] ?? -1;

  const handlePrevious = () => {
    setPage((value) => Math.max(0, value - 1));
  };

  const handleNext = () => {
    setPage((value) => Math.min(totalPages - 1, value + 1));
  };

  const handleSelect = (optionIndex: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[safePage] = optionIndex;
      return next;
    });
  };

  const handleFinish = async () => {
    if (submitting) return;
    const correctCount = questions.reduce((acc, item, index) => {
      return acc + (answers[index] === item.correctIndex ? 1 : 0);
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
          prompt: question.text,
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
              onClick={() => handleSelect(index)}
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
      </div>
    </ActivityLayout>
  );
}

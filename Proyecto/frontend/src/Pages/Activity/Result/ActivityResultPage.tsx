import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import ActivityLayout from "../../../Layouts/ActivityLayout/ActivityLayout";
import styles from "./ActivityResultPage.module.css";
import type { ActivityResultState, AnswerReview } from "./types";

function computeStars(summary: ActivityResultState["summary"]): number {
  const total = summary.totalCount ?? 0;
  if (total <= 0) return 3;
  const correct = summary.correctCount ?? 0;
  const ratio = Math.max(0, Math.min(1, correct / total));
  return Math.round(ratio * 3);
}

function resolveMessage(stars: number): string {
  if (stars >= 3) return "¡Excelente! Obtuviste todas las respuestas correctas.";
  if (stars === 2)
    return "¡Buen trabajo! Repasa las preguntas marcadas para alcanzar las 3 estrellas.";
  if (stars === 1)
    return "Vas por buen camino. Revisa la retroalimentación y vuelve a intentarlo.";
  return "No te desanimes. Analiza las respuestas y verás cómo mejoras la próxima vez.";
}

function OptionReview({
  option,
  index,
  review,
}: {
  option: string;
  index: number;
  review: AnswerReview;
}) {
  const isCorrect = index === review.correctIndex;
  const isSelected = index === review.selectedIndex;
  return (
    <li
      className={styles.optionItem}
      data-correct={isCorrect || undefined}
      data-selected={isSelected || undefined}
    >
      <span className={styles.optionBadge}>{String.fromCharCode(65 + index)}</span>
      <span className={styles.optionCopy}>{option}</span>
      <span className={styles.optionStatus}>
        {isCorrect ? "Respuesta correcta" : isSelected ? "Tu respuesta" : ""}
      </span>
    </li>
  );
}

export default function ActivityResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { subjectId } = useParams<{ subjectId: string }>();

  const state = location.state as ActivityResultState | undefined;
  const fallbackBackTo = subjectId ? `/subjects/${subjectId}` : "/subjects";

  if (!state) {
    return <Navigate to={fallbackBackTo} replace />;
  }

  const { backTo, activityTitle, summary, answers } = state;
  const target = backTo || fallbackBackTo;
  const stars = computeStars(summary);
  const message = resolveMessage(stars);
  const correctCount = summary.correctCount ?? 0;
  const totalCount = summary.totalCount ?? 0;

  const handleFinish = () => {
    navigate(target);
  };

  return (
    <ActivityLayout
      title={<span className={styles.pageTitle}>Resultados de la actividad</span>}
      backTo={target}
    >
      <div className={styles.wrapper}>
        <section className={styles.summaryCard}>
          <h1 className={styles.activityTitle}>{activityTitle}</h1>
          <div className={styles.starsRow} aria-label={`${stars} de 3 estrellas`}>
            {[0, 1, 2].map((index) => (
              <span
                key={`star-${index}`}
                className={styles.star}
                data-active={index < stars || undefined}
                aria-hidden="true"
              >
                ★
              </span>
            ))}
          </div>
          <p className={styles.feedbackCopy}>{message}</p>
          <div className={styles.scoreRow}>
            <div className={styles.scoreBadge}>
              <span className={styles.scoreLabel}>Respuestas correctas</span>
              <span className={styles.scoreValue}>
                {correctCount} / {totalCount || "-"}
              </span>
            </div>
            <div className={styles.scoreBadge}>
              <span className={styles.scoreLabel}>XP obtenida</span>
              <span className={styles.scoreValue}>+{summary.xpAwarded}</span>
            </div>
            <div className={styles.scoreBadge}>
              <span className={styles.scoreLabel}>Monedas</span>
              <span className={styles.scoreValue}>+{summary.coinsAwarded}</span>
            </div>
          </div>
        </section>

        {answers && answers.length > 0 ? (
          <section className={styles.reviewSection}>
            <header className={styles.reviewHeader}>
              <h2>Retroalimentación</h2>
              <p>
                Observa en qué preguntas acertaste y cuáles puedes repasar para mejorar tu
                puntuación.
              </p>
            </header>
            <ol className={styles.reviewList}>
              {answers.map((review, index) => {
                const isCorrect = review.correctIndex === review.selectedIndex;
                return (
                  <li
                    key={`review-${index}`}
                    className={styles.reviewItem}
                    data-correct={isCorrect || undefined}
                  >
                    <div className={styles.reviewPrompt}>
                      <span className={styles.reviewIndex}>Pregunta {index + 1}</span>
                      <p>{review.prompt}</p>
                      {review.selectedIndex === -1 ? (
                        <p className={styles.missedNote}>
                          No respondiste esta pregunta. ¡Puedes intentarlo nuevamente!
                        </p>
                      ) : null}
                    </div>
                    <ul className={styles.optionsList}>
                      {review.options.map((option, optionIndex) => (
                        <OptionReview
                          key={`option-${optionIndex}`}
                          option={option}
                          index={optionIndex}
                          review={review}
                        />
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ol>
          </section>
        ) : null}

        <div className={styles.actions}>
          <button className={styles.finishButton} onClick={handleFinish} type="button">
            Finalizar actividad
          </button>
        </div>
      </div>
    </ActivityLayout>
  );
}

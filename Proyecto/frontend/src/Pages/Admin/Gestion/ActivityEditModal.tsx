import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import styles from "./ActivityForm.module.css";
import { SubjectActivity } from "../../../Lib/activityMocks";

import { useActivitiesStore } from "../../../stores/activitiesStore";

type Question = {
  question: string;
  answers: string[];
  correct?: number;
};

const MIN_ANSWERS = 2;
const MAX_ANSWERS = 4;

const createEmptyQuestion = (): Question => ({
  question: "",
  answers: Array.from({ length: MIN_ANSWERS }, () => ""),
  correct: 0,
});

const resolveInitialAttempts = (activity: SubjectActivity): number => {
  const rawAttempts =
    (activity.fieldsJSON as Record<string, unknown> | undefined)?.attempts ??
    (activity.config as Record<string, unknown> | undefined)?.attempts ??
    null;
  if (typeof rawAttempts === "number" && Number.isFinite(rawAttempts) && rawAttempts > 0) {
    return Math.min(Math.max(Math.floor(rawAttempts), 1), 99);
  }
  return 1;
};

const normalizeInitialQuestions = (raw: unknown): Question[] => {
  if (!Array.isArray(raw)) return [];

  const mapped = raw.map((entry) => {
    if (!entry || typeof entry !== "object") return null;

      const value = entry as Record<string, unknown>;
      const questionValue = value.question ?? value.text;
      if (typeof questionValue !== "string") return null;

      const answersValue = value.answers ?? value.options;
      const rawAnswers = Array.isArray(answersValue)
        ? answersValue.filter((answer): answer is string => typeof answer === "string")
        : [];

      const paddedAnswers = [...rawAnswers];
      while (paddedAnswers.length < MIN_ANSWERS) {
        paddedAnswers.push("");
      }

      const trimmedAnswers = paddedAnswers.slice(0, MAX_ANSWERS);
      const correctValue = value.correct ?? value.correctIndex;
      let correctIndex =
        typeof correctValue === "number" && correctValue >= 0 && correctValue < trimmedAnswers.length
          ? correctValue
          : 0;

      if (typeof value.correctOption === "string") {
        const matchIndex = trimmedAnswers.findIndex((answer) => answer === value.correctOption);
        if (matchIndex >= 0) correctIndex = matchIndex;
      }

      return {
        question: questionValue,
        answers: trimmedAnswers,
        correct: correctIndex,
      } satisfies Question;
    })
    return mapped.filter(Boolean) as Question[];
};

interface Props {
  activity: SubjectActivity;
  onClose: () => void;
  onMockDelete?: (id: string) => void;
  onBackendDelete?: () => void;
}

export default function ActivityEditModal({ activity, onClose, onMockDelete, onBackendDelete }: Props) {
  const [title, setTitle] = useState(activity.title);
  const initialQuestions = useMemo(
    () =>
      normalizeInitialQuestions(
        (activity.fieldsJSON as Record<string, unknown> | undefined)?.questions ??
          (activity.config as Record<string, unknown> | undefined)?.questions ??
          [],
      ),
    [activity.config, activity.fieldsJSON],
  );
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [fileUrl, setFileUrl] = useState<string>(activity.fieldsJSON?.fileUrl ?? "");
  const [attempts, setAttempts] = useState<number>(() => resolveInitialAttempts(activity));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { update, remove } = useActivitiesStore();
  const overlayTitleId = useId();
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [onClose]);

  useEffect(() => {
    setQuestions(initialQuestions.length > 0 ? initialQuestions : []);
  }, [initialQuestions]);

  useEffect(() => {
    setAttempts(resolveInitialAttempts(activity));
  }, [activity]);

  // Handlers para preguntas y respuestas
  const handleQuestionChange = (idx: number, value: string) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, question: value } : q)));
  };
  const handleAnswerChange = (qIdx: number, aIdx: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? {
              ...q,
              answers: q.answers.map((a, j) => (j === aIdx ? value : a)),
            }
          : q
      )
    );
  };
  const handleAddQuestion = () => {
    setQuestions((prev) => [...prev, createEmptyQuestion()]);
  };
  const handleRemoveQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };
  const handleAddAnswer = (qIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        if (q.answers.length >= MAX_ANSWERS) return q;
        const nextAnswers = [...q.answers, ""];
        const correct =
          typeof q.correct === "number" && q.correct >= 0 ? Math.min(q.correct, nextAnswers.length - 1) : 0;
        return {
          ...q,
          answers: nextAnswers,
          correct,
        };
      }),
    );
  };
  const handleCorrectChange = (qIdx: number, correctIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx ? { ...q, correct: correctIdx } : q,
      )
    );
  };
  const handleRemoveAnswer = (qIdx: number, aIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? {
              ...q,
              answers:
                q.answers.length <= MIN_ANSWERS
                  ? q.answers
                  : q.answers.filter((_, j) => j !== aIdx),
              correct:
                typeof q.correct !== "number"
                  ? undefined
                  : q.answers.length <= MIN_ANSWERS
                  ? q.correct
                  : q.correct === aIdx
                  ? 0
                  : q.correct > aIdx
                  ? q.correct - 1
                  : q.correct,
            }
          : q
      )
    );
  };

  const handleAttemptsChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(event.target.value, 10);
    if (Number.isNaN(value)) {
      setAttempts(1);
      return;
    }
    const clamped = Math.min(Math.max(value, 1), 99);
    setAttempts(clamped);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (nextFile) {
      const objectUrl = URL.createObjectURL(nextFile);
      objectUrlRef.current = objectUrl;
      setFileUrl(objectUrl);
    }
  };

  // Guardar cambios (draft)
  const handleSave = async (publish = false) => {
    setSaving(true);
    setError(null);
    try {
      const fieldsJSON = { ...(activity.fieldsJSON ?? {}) };
      let nextConfig: Record<string, unknown> | undefined =
        activity.config && typeof activity.config === "object"
          ? { ...(activity.config as Record<string, unknown>) }
          : undefined;

      if (activity.type === "quiz" || activity.type === "infografia") {
        const sanitizedQuestions = questions
          .map((question) => {
            const trimmedQuestion = question.question.trim();
            const normalizedAnswers = question.answers
              .map((answer) => answer.trim())
              .filter((answer) => answer.length > 0)
              .slice(0, MAX_ANSWERS);

            if (!trimmedQuestion || normalizedAnswers.length < MIN_ANSWERS) {
              return null;
            }

            const candidateCorrect = question.correct ?? 0;
            const safeCorrectIndex = Math.max(
              0,
              Math.min(candidateCorrect, normalizedAnswers.length - 1),
            );
            const correctAnswer = normalizedAnswers[safeCorrectIndex] ?? null;

            return {
              question: trimmedQuestion,
              text: trimmedQuestion,
              answers: normalizedAnswers,
              options: normalizedAnswers,
              correct: safeCorrectIndex,
              correctIndex: safeCorrectIndex,
              correctAnswer,
              correctOption: correctAnswer,
            };
          })
          .filter(Boolean) as Record<string, unknown>[];

        fieldsJSON.questions = sanitizedQuestions;
        fieldsJSON.attempts = attempts;
        fieldsJSON.activityType = activity.type;
        nextConfig = {
          ...(nextConfig ?? {}),
          ...fieldsJSON,
          activityType: activity.type,
        };
      } else if (activity.type === "ppt-animada" || activity.type === "video") {
        if (fileUrl) {
          fieldsJSON.fileUrl = fileUrl;
        }
        fieldsJSON.activityType = activity.type;
        nextConfig = {
          ...(nextConfig ?? {}),
          ...fieldsJSON,
          activityType: activity.type,
        };
      } else if (fieldsJSON) {
        fieldsJSON.activityType = activity.type;
        nextConfig = {
          ...(nextConfig ?? {}),
          ...fieldsJSON,
          activityType: activity.type,
        };
      }
      await update(activity.id, {
        title,
        fieldsJSON,
        config: nextConfig,
        status: publish ? "published" : activity.status,
        templateType: activity.templateType ?? activity.type,
      });
      onClose();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Error al guardar";
      setError(message);
    } finally {
      setSaving(false);
    }
  };
  // Eliminar actividad
  // Intenta primero eliminar actividades reales del backend (MongoDB)
  const isMongoId = (id: string) => /^[a-f\d]{24}$/i.test(id);
    const handleDelete = async () => {
      if (!window.confirm("¿Seguro que deseas eliminar esta actividad?")) return;
      setSaving(true);
      setError(null);
      // Identificamos si el id corresponde a un documento real de MongoDB
      const rawBackendId = (activity as { _id?: unknown })._id;
      const normalizedBackendId =
        typeof rawBackendId === "string" && rawBackendId.trim().length > 0
          ? rawBackendId
          : activity.id;
      const mongoId = String(normalizedBackendId ?? "");
    const shouldDeleteFromBackend = isMongoId(mongoId);
    try {
      if (shouldDeleteFromBackend) {
        await remove(mongoId, activity.subjectSlug ?? null);
        if (onBackendDelete) onBackendDelete();
        else onClose();
      } else {
        if (activity.id) {
          onMockDelete?.(activity.id);
        }
        onClose();
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Error al eliminar";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  // Render dinámico según tipo
  return (
    <div
      className={styles.modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby={overlayTitleId}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        className={styles.modalContent}
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          handleSave(false);
        }}
      >
        <h2 id={overlayTitleId} className={styles.formTitle}>Editar Actividad</h2>
        <label className={styles.formLabel}>
          Título
          <input
            className={styles.formInput}
            value={title}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)}
            required
            placeholder="Ej: Título de la actividad"
          />
        </label>
        {(activity.type === "quiz" || activity.type === "infografia") && (
          <label className={styles.formLabel}>
            Intentos permitidos
            <input
              className={styles.formInput}
              type="number"
              min={1}
              max={99}
              value={attempts}
              onChange={handleAttemptsChange}
            />
          </label>
        )}
        {/* Quiz/Infografía: Preguntas y respuestas (siempre visible para debug) */}
        {(activity.type === "quiz" || activity.type === "infografia") && (
          <div>
            <div className={styles.formLabel} style={{ marginBottom: 0 }}>
              <strong>Preguntas y alternativas</strong>
              <p style={{ fontSize: 12, marginTop: 4 }}>
                Puedes añadir hasta {MAX_ANSWERS} alternativas por pregunta y marcar cuál es la correcta.
              </p>
            </div>
            {questions.map((q, qIdx) => {
              const radioName = `${overlayTitleId}-question-${qIdx}`;
              return (
                <div
                  key={qIdx}
                  style={{
                    marginBottom: 16,
                    background: "#e0e7ff",
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <input
                    className={styles.formInput}
                    type="text"
                    value={q.question}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      handleQuestionChange(qIdx, event.target.value)
                    }
                    placeholder={`Pregunta ${qIdx + 1}`}
                    required
                  />
                  <div style={{ marginTop: 8 }}>
                    {q.answers.map((a: string, aIdx: number) => {
                      const disableRemove = q.answers.length <= MIN_ANSWERS;
                      return (
                        <div
                          key={aIdx}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "auto 1fr auto",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 6,
                          }}
                        >
                          <input
                            type="radio"
                            name={radioName}
                            checked={q.correct === aIdx}
                            onChange={() => handleCorrectChange(qIdx, aIdx)}
                            aria-label={`Marcar respuesta ${aIdx + 1} como correcta`}
                          />
                          <input
                            className={styles.formInput}
                            type="text"
                            value={a}
                            onChange={(event: ChangeEvent<HTMLInputElement>) =>
                              handleAnswerChange(qIdx, aIdx, event.target.value)
                            }
                            placeholder={`Respuesta ${aIdx + 1}`}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveAnswer(qIdx, aIdx)}
                            className={styles.cancelBtn}
                            style={{ padding: "4px 10px", fontSize: 13 }}
                            disabled={disableRemove}
                            aria-disabled={disableRemove}
                            title={disableRemove ? "Cada pregunta debe tener al menos dos alternativas" : "Eliminar respuesta"}
                          >
                            –
                          </button>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => handleAddAnswer(qIdx)}
                      className={styles.submitBtn}
                      style={{ padding: "4px 12px", fontSize: 13, marginTop: 2 }}
                      disabled={q.answers.length >= MAX_ANSWERS}
                      aria-disabled={q.answers.length >= MAX_ANSWERS}
                    >
                      + Añadir respuesta
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(qIdx)}
                    className={styles.cancelBtn}
                    style={{ padding: "4px 12px", fontSize: 13, marginTop: 8 }}
                  >
                    Eliminar pregunta
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={handleAddQuestion}
              className={styles.submitBtn}
              style={{ padding: "6px 16px", fontSize: 14 }}
            >
              + Añadir pregunta
            </button>
          </div>
        )}

        {/* Solo permitir carga de archivos cuando corresponda al tipo de actividad */}
        {activity.type === "video" && (
          <>
            <div className={styles.formLabel} style={{ marginBottom: 0 }}>
              <strong>Archivo Video:</strong>
            </div>
            <input
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className={styles.formInput}
              title="Subir archivo de video"
              placeholder="Selecciona un archivo de video"
            />
            {fileUrl && (
              <div style={{ marginTop: 10 }}>
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                  Ver archivo actual
                </a>
              </div>
            )}
          </>
        )}
        {error && <div className={styles.errorMsg}>{error}</div>}
        <div className={styles.formActions}>
          <button type="submit" className={styles.submitBtn} disabled={saving}>
            Guardar cambios
          </button>
          <button type="button" className={styles.submitBtn} style={{background: '#00c48c'}} onClick={() => handleSave(true)} disabled={saving}>
            Guardar y publicar
          </button>
          <button type="button" className={styles.cancelBtn} style={{borderColor: '#ff4d4f', color: '#ff4d4f'}} onClick={handleDelete} disabled={saving}>
            Eliminar
          </button>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={saving}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

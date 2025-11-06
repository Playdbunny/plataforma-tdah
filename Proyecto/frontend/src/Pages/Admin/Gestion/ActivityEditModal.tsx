import { useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import styles from "./ActivityForm.module.css";
import { SubjectActivity } from "../../../Lib/activityMocks";

import { useActivitiesStore } from "../../../stores/activitiesStore";

type Question = {
  question: string;
  answers: string[];
  correct?: number;
};

interface Props {
  activity: SubjectActivity;
  onClose: () => void;
  onMockDelete?: (id: string) => void;
  onBackendDelete?: () => void;
}

export default function ActivityEditModal({ activity, onClose, onMockDelete, onBackendDelete }: Props) {
  const [title, setTitle] = useState(activity.title);
  const initialQuestions = Array.isArray(activity.fieldsJSON?.questions)
    ? (activity.fieldsJSON!.questions as Question[])
    : [];
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [fileUrl, setFileUrl] = useState<string>(activity.fieldsJSON?.fileUrl ?? "");
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
    setQuestions((prev) => [...prev, { question: "", answers: [""], correct: 0 }]);
  };
  const handleRemoveQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };
  const handleAddAnswer = (qIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? {
              ...q,
              answers: [...q.answers, ""],
              correct:
                typeof q.correct === "number" ? q.correct : q.answers.length,
            }
          : q
      )
    );
  };
  const handleRemoveAnswer = (qIdx: number, aIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? {
              ...q,
              answers: q.answers.filter((_, j) => j !== aIdx),
              correct:
                typeof q.correct !== "number"
                  ? undefined
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
      if (activity.type === "quiz" || activity.type === "infografia") {
        fieldsJSON.questions = questions;
      } else if (activity.type === "ppt-animada" || activity.type === "video") {
        if (fileUrl) {
          fieldsJSON.fileUrl = fileUrl;
        }
      }
      await update(activity.id, {
        title,
        fieldsJSON,
        status: publish ? "published" : activity.status,
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
    const mongoId = String((activity as any)._id || activity.id || "");
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
            onChange={e => setTitle(e.target.value)}
            required
            placeholder="Ej: Título de la actividad"
          />
        </label>
        {/* Quiz/Infografía: Preguntas y respuestas (siempre visible para debug) */}
        <div className={styles.formLabel} style={{marginBottom: 0}}>
          <strong>Preguntas y respuestas:</strong>
        </div>
        <div>
          {questions.map((q, qIdx) => (
            <div key={qIdx} style={{marginBottom: 16, background: '#e0e7ff', borderRadius: 10, padding: 12}}>
              <input
                className={styles.formInput}
                type="text"
                value={q.question}
                onChange={e => handleQuestionChange(qIdx, e.target.value)}
                placeholder={`Pregunta ${qIdx + 1}`}
                required
              />
              <div style={{marginTop: 8}}>
                {q.answers.map((a: string, aIdx: number) => (
                  <div key={aIdx} style={{display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6}}>
                    <input
                      className={styles.formInput}
                      type="text"
                      value={a}
                      onChange={e => handleAnswerChange(qIdx, aIdx, e.target.value)}
                      placeholder={`Respuesta ${aIdx + 1}`}
                      required
                    />
                    <button type="button" onClick={() => handleRemoveAnswer(qIdx, aIdx)} className={styles.cancelBtn} style={{padding: '4px 10px', fontSize: 13}}>
                      –
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => handleAddAnswer(qIdx)} className={styles.submitBtn} style={{padding: '4px 12px', fontSize: 13, marginTop: 2}}>
                  + Añadir respuesta
                </button>
              </div>
              <button type="button" onClick={() => handleRemoveQuestion(qIdx)} className={styles.cancelBtn} style={{padding: '4px 12px', fontSize: 13, marginTop: 8}}>
                Eliminar pregunta
              </button>
            </div>
          ))}
          <button type="button" onClick={handleAddQuestion} className={styles.submitBtn} style={{padding: '6px 16px', fontSize: 14}}>
            + Añadir pregunta
          </button>
        </div>

        {/* PPT/Video: Subir archivo (siempre visible para debug) */}
        <div className={styles.formLabel} style={{marginBottom: 0}}>
          <strong>Archivo {activity.type === "ppt-animada" ? "PPT" : "Video"}:</strong>
        </div>
        <input
          type="file"
          accept={activity.type === "ppt-animada" ? ".ppt,.pptx,.pdf" : "video/*"}
          onChange={handleFileChange}
          className={styles.formInput}
          title={activity.type === "ppt-animada" ? "Subir archivo PPT o PDF" : "Subir archivo de video"}
          placeholder={activity.type === "ppt-animada" ? "Selecciona un archivo PPT o PDF" : "Selecciona un archivo de video"}
        />
        {fileUrl && (
          <div style={{marginTop: 10}}>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer">Ver archivo actual</a>
          </div>
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

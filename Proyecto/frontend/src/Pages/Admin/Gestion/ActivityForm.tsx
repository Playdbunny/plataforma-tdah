import { useState } from "react";
import { useActivitiesStore } from "../../../stores/activitiesStore";
import { useAuthStore } from "../../../stores/authStore";
import { useSubjectsStore } from "../../../stores/subjectsStore";
import { SubjectActivityType, SUBJECT_ACTIVITY_TYPE_LABELS, BackendActivityPayload } from "../../../Lib/activityMocks";
import styles from "./ActivityForm.module.css";

interface ActivityFormProps {
  subjectSlug: string;
  onClose: () => void;
}

export default function ActivityForm({ subjectSlug, onClose }: ActivityFormProps) {
  const { create, loading, error } = useActivitiesStore();
  const { user } = useAuthStore();
  const { items: subjects } = useSubjectsStore();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<SubjectActivityType>("infografia");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Buscar la materia seleccionada
    const subject = subjects.find(s => s.slug === subjectSlug);
    const payload: BackendActivityPayload = {
      title,
      type,
      description,
      status: "draft",
      updatedAt: new Date().toISOString(),
      subjectSlug,
      // Campos requeridos por el backend:
      createdBy: user?.id ?? "",
      fieldsJSON: {},
      templateType: "default",
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, ""),
      subjectId: subject?._id ?? "",
    };
    await create(payload);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className={styles.modalContent}>
      <h2 className={styles.formTitle}>Nueva Actividad</h2>
      <label className={styles.formLabel}>
        Título
        <input
          className={styles.formInput}
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          placeholder="Ej: Quiz Edad Media"
        />
      </label>
      <label className={styles.formLabel}>
        Tipo
        <select
          className={styles.formSelect}
          value={type}
          onChange={e => setType(e.target.value as SubjectActivityType)}
        >
          {Object.entries(SUBJECT_ACTIVITY_TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </label>
      <label className={styles.formLabel}>
        Descripción
        <textarea
          className={styles.formTextarea}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Describe brevemente la actividad..."
        />
      </label>
      {error && <div className={styles.errorMsg}>{error}</div>}
      <div className={styles.formActions}>
        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? "Guardando..." : "Crear"}
        </button>
        <button type="button" className={styles.cancelBtn} onClick={onClose}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
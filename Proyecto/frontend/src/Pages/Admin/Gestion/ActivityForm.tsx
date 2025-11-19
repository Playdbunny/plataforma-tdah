import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useActivitiesStore } from "../../../stores/activitiesStore";
import { useSubjectsStore } from "../../../stores/subjectsStore";
import {
  SubjectActivityType,
  SUBJECT_ACTIVITY_TYPE_LABELS,
  BackendActivityPayload,
  ActivityKind,
} from "../../../Lib/activityMocks";
import styles from "./ActivityForm.module.css";

interface ActivityFormProps {
  subjectSlug: string;
  onClose: () => void;
}

const ACCEPT_BY_TYPE: Partial<Record<SubjectActivityType, string>> = {
  infografia: "image/png,image/jpeg,image/webp,image/gif",
  video: "video/*",
  "ppt-animada":
    ".ppt,.pptx,.pdf,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation",
  quiz:
    "image/png,image/jpeg,image/webp,image/gif,application/pdf,.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

const HELPER_TEXT: Partial<Record<SubjectActivityType, string>> = {
  infografia: "Formatos permitidos: PNG, JPG, WEBP o GIF (máx. 25 MB).",
  video:
    "Puedes subir un archivo de video (MP4, MOV…) o elegir la opción de enlace para pegar una URL.",
  "ppt-animada": "Acepta archivos PPT, PPTX o PDF de hasta 25 MB.",
  quiz: "Admite imágenes (PNG, JPG, WEBP, GIF), además de PPT/PPTX o PDF (máx. 25 MB).",
};

const TYPES_WITH_RESOURCE: SubjectActivityType[] = [
  "infografia",
  "video",
  "ppt-animada",
  "quiz",
];

const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

const BANNER_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";
const MAX_BANNER_SIZE_MB = 10;
const MAX_BANNER_SIZE = MAX_BANNER_SIZE_MB * 1024 * 1024;
const BANNER_TYPE_REGEX = /^image\/(png|jpe?g|webp|gif)$/i;

const DEFAULT_ACTIVITY_KIND: ActivityKind = "embedded_quiz";

const KIND_BY_TYPE: Record<SubjectActivityType, ActivityKind> = {
  infografia: "embedded_quiz",
  video: "video_quiz",
  "ppt-animada": "ppt_review",
  quiz: "multiple_choice",
  juego: "embedded_quiz",
};

const DEFAULT_XP_REWARD = 150;

function getFileExtension(file: File) {
  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

function isFileAllowedForType(activityType: SubjectActivityType, file: File) {
  const mime = file.type;
  const extension = getFileExtension(file);

  switch (activityType) {
    case "infografia":
      return mime.startsWith("image/");
    case "video":
      return mime.startsWith("video/");
    case "ppt-animada":
      return (
        mime === "application/pdf" ||
        extension === "pdf" ||
        extension === "ppt" ||
        extension === "pptx"
      );
    case "quiz":
      return (
        mime.startsWith("image/") ||
        mime === "application/pdf" ||
        extension === "pdf" ||
        extension === "ppt" ||
        extension === "pptx"
      );
    default:
      return true;
  }
}

function invalidFileMessageFor(type: SubjectActivityType) {
  switch (type) {
    case "infografia":
      return "Selecciona una imagen en formato PNG, JPG, WEBP o GIF.";
    case "video":
      return "Selecciona un archivo de video válido (MP4, MOV, WEBM, etc.).";
    case "ppt-animada":
      return "Selecciona un archivo PPT, PPTX o PDF.";
    case "quiz":
      return "Puedes adjuntar imágenes (PNG, JPG, WEBP, GIF), PPT/PPTX o PDF.";
    default:
      return "Formato de archivo no permitido para este tipo de actividad.";
  }
}

function resolveAssetType(activityType: SubjectActivityType, file: File) {
  if (activityType === "video") return "video";
  if (activityType === "ppt-animada") return "document";
  if (activityType === "infografia") return "image";
  if (activityType === "quiz") {
    return file.type.startsWith("image/") ? "image" : "document";
  }
  return "document";
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (err) {
    return false;
  }
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("No se pudo leer el archivo seleccionado."));
    reader.readAsDataURL(file);
  });
}

function validateBannerUrl(u: string) {
  const trimmed = u.trim();
  if (!trimmed) {
    throw new Error("La URL no puede estar vacía.");
  }
  if (trimmed.startsWith("data:")) {
    throw new Error("URL no válida (data:)");
  }
  if (trimmed.length > 512) {
    throw new Error("URL demasiado larga (>512)");
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error("Debe ser una URL http(s) válida");
  }
  return trimmed;
}

export default function ActivityForm({ subjectSlug, onClose }: ActivityFormProps) {
  const { create, loading, error } = useActivitiesStore();
  const { items: subjects } = useSubjectsStore();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<SubjectActivityType>("infografia");
  const [description, setDescription] = useState("");
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [resourcePreview, setResourcePreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerUrlInput, setBannerUrlInput] = useState("");
  const [videoMode, setVideoMode] = useState<"file" | "link">("file");
  const [videoLink, setVideoLink] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (resourcePreview) {
        URL.revokeObjectURL(resourcePreview);
      }
    };
  }, [resourcePreview]);

  useEffect(() => {
    return () => {
      if (bannerPreview) {
        URL.revokeObjectURL(bannerPreview);
      }
    };
  }, [bannerPreview]);

  const resetResourceState = () => {
    setResourceFile(null);
    setVideoLink("");
    setFormError(null);
    setVideoMode("file");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setResourcePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const clearBannerFile = () => {
    setBannerFile(null);
    setBannerPreview((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
    if (bannerInputRef.current) {
      bannerInputRef.current.value = "";
    }
  };

  const resetBannerState = () => {
    clearBannerFile();
    setBannerUrlInput("");
  };

  const handleBannerChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      resetBannerState();
      return;
    }

    if (!BANNER_TYPE_REGEX.test(file.type)) {
      setFormError("Selecciona una imagen PNG, JPG, WEBP o GIF para el banner.");
      event.target.value = "";
      resetBannerState();
      return;
    }

    if (file.size > MAX_BANNER_SIZE) {
      setFormError(`El banner supera el límite de ${MAX_BANNER_SIZE_MB} MB.`);
      event.target.value = "";
      resetBannerState();
      return;
    }

    setBannerUrlInput("");
    setFormError(null);
    setBannerFile(file);
    const previewUrl = URL.createObjectURL(file);
    setBannerPreview((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return previewUrl;
    });
  };

  const handleRemoveBanner = () => {
    setFormError(null);
    resetBannerState();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (resourcePreview) {
      URL.revokeObjectURL(resourcePreview);
      setResourcePreview(null);
    }

    if (!file) {
      setResourceFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFormError(`El archivo supera el límite de ${MAX_FILE_SIZE_MB} MB.`);
      event.target.value = "";
      setResourceFile(null);
      return;
    }

    if (!isFileAllowedForType(type, file)) {
      setFormError(invalidFileMessageFor(type));
      event.target.value = "";
      setResourceFile(null);
      return;
    }

    setResourceFile(file);
    setFormError(null);

    if (
      type === "infografia" ||
      (type === "quiz" && file.type.startsWith("image/"))
    ) {
      const previewUrl = URL.createObjectURL(file);
      setResourcePreview(previewUrl);
    } else {
      setResourcePreview(null);
    }
  };

  const handleVideoModeChange = (mode: "file" | "link") => {
    setVideoMode(mode);
    setFormError(null);
    if (mode === "file") {
      setVideoLink("");
    } else {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setResourceFile(null);
      if (resourcePreview) {
        URL.revokeObjectURL(resourcePreview);
        setResourcePreview(null);
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      const normalizedTitle = title.trim();
      const normalizedDescription = description.trim();
      // Buscar la materia seleccionada
      const subject = subjects.find((s) => s.slug === subjectSlug);
      if (!subject || !subject._id) {
        setFormError(
          "No se encontró la materia seleccionada. Refresca la lista e inténtalo nuevamente.",
        );
        return;
      }

      const fieldsJSON: Record<string, any> = {};

      if (type === "quiz" && !fieldsJSON.questions) {
        fieldsJSON.questions = [];
      }
      fieldsJSON.activityType = type;

      if (TYPES_WITH_RESOURCE.includes(type)) {
        if (type === "video" && videoMode === "link") {
          const trimmedLink = videoLink.trim();
          if (!trimmedLink) {
            setFormError("Ingresa un enlace de video.");
            return;
          }
          if (!isValidHttpUrl(trimmedLink)) {
            setFormError("El enlace debe comenzar con http:// o https://");
            return;
          }
          fieldsJSON.fileUrl = trimmedLink;
          fieldsJSON.asset = {
            type: "video",
            source: "link",
            url: trimmedLink,
          };
        } else {
          if (!resourceFile) {
            setFormError("Selecciona un archivo para adjuntar a la actividad.");
            return;
          }

          if (resourceFile.size > MAX_FILE_SIZE) {
            setFormError(`El archivo supera el límite de ${MAX_FILE_SIZE_MB} MB.`);
            return;
          }

          if (!isFileAllowedForType(type, resourceFile)) {
            setFormError(invalidFileMessageFor(type));
            return;
          }

          const dataUrl = await fileToDataUrl(resourceFile);
          const assetType = resolveAssetType(type, resourceFile);
          fieldsJSON.fileUrl = dataUrl;
          fieldsJSON.asset = {
            type: assetType,
            source: "upload",
            name: resourceFile.name,
            size: resourceFile.size,
            mimeType: resourceFile.type,
            extension: getFileExtension(resourceFile),
            dataUrl,
          };
        }
      }

      let manualBannerUrl: string | null = null;
      if (!bannerFile) {
        const trimmedUrl = bannerUrlInput.trim();
        if (trimmedUrl) {
          try {
            manualBannerUrl = validateBannerUrl(trimmedUrl);
          } catch (validationError) {
            const message =
              validationError instanceof Error
                ? validationError.message
                : "URL de banner no válida.";
            setFormError(message);
            return;
          }
        }
      }

      const activityKind = KIND_BY_TYPE[type] ?? DEFAULT_ACTIVITY_KIND;
      const config = { ...fieldsJSON, activityType: type };

      const payload: BackendActivityPayload = {
        title: normalizedTitle,
        type,
        description: normalizedDescription || undefined,
        status: "published",
        updatedAt: new Date().toISOString(),
        subjectSlug,
        // Campos requeridos por el backend:
        fieldsJSON,
        config,
        kind: activityKind,
        xpReward: DEFAULT_XP_REWARD,
        templateType: type,
        slug: normalizedTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, ""),
        subjectId: subject._id,
        bannerUrl: manualBannerUrl ?? null,
      };

      const createOptions = bannerFile ? { bannerFile } : undefined;

      await create(payload, createOptions);
      const latestError = useActivitiesStore.getState().error;
      if (latestError) {
        setFormError(latestError);
        return;
      }

      if (resourcePreview) {
        URL.revokeObjectURL(resourcePreview);
      }
      if (bannerPreview) {
        URL.revokeObjectURL(bannerPreview);
      }
      onClose();
    } catch (err: any) {
      setFormError(err?.message || "No se pudo crear la actividad.");
    }
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
          onChange={(e) => {
            const nextType = e.target.value as SubjectActivityType;
            setType(nextType);
            resetResourceState();
          }}
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
      <div className={styles.formLabel}>
        <span>Banner de la actividad (opcional)</span>
        <input
          ref={bannerInputRef}
          type="file"
          className={styles.formInput}
          accept={BANNER_ACCEPT}
          onChange={handleBannerChange}
        />
        <input
          type="text"
          className={styles.formInput}
          placeholder="https://ejemplo.com/banner.jpg"
          value={bannerUrlInput}
          onChange={(event) => {
            const value = event.target.value;
            setBannerUrlInput(value);
            setFormError(null);
            if (bannerFile || bannerPreview) {
              clearBannerFile();
            }
          }}
        />
        <p className={styles.helperText}>
          También puedes pegar una URL pública (http o https) para usarla como banner.
        </p>
        <p className={styles.helperText}>
          Formatos permitidos: PNG, JPG, WEBP o GIF (máx. {MAX_BANNER_SIZE_MB} MB).
        </p>
        {bannerPreview && (
          <div className={styles.bannerPreviewWrap}>
            <img
              src={bannerPreview}
              alt="Vista previa del banner de la actividad"
              className={styles.bannerPreview}
            />
            <button
              type="button"
              className={styles.removeBannerBtn}
              onClick={handleRemoveBanner}
            >
              Quitar banner
            </button>
          </div>
        )}
      </div>
      {TYPES_WITH_RESOURCE.includes(type) && (
        <div className={styles.formLabel}>
          <span>Recurso asociado</span>
          {type === "video" ? (
            <>
              <div className={styles.radioGroup}>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="video-source"
                    value="file"
                    checked={videoMode === "file"}
                    onChange={() => handleVideoModeChange("file")}
                  />
                  Subir archivo
                </label>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="video-source"
                    value="link"
                    checked={videoMode === "link"}
                    onChange={() => handleVideoModeChange("link")}
                  />
                  Usar enlace
                </label>
              </div>

              {videoMode === "file" ? (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className={styles.formInput}
                    accept={ACCEPT_BY_TYPE.video}
                    onChange={handleFileChange}
                    title="Sube un archivo de video"
                  />
                  <p className={styles.helperText}>{HELPER_TEXT.video}</p>
                </>
              ) : (
                <>
                  <input
                    type="url"
                    className={styles.formInput}
                    placeholder="https://video.com/ejemplo"
                    value={videoLink}
                    onChange={(event) => setVideoLink(event.target.value)}
                  />
                  <p className={styles.helperText}>
                    Pega un enlace público (YouTube, Vimeo u otro servicio con http/https).
                  </p>
                </>
              )}
            </>
          ) : (
            <>
              <input
                ref={fileInputRef}
                type="file"
                className={styles.formInput}
                accept={ACCEPT_BY_TYPE[type]}
                onChange={handleFileChange}
              />
              <p className={styles.helperText}>{HELPER_TEXT[type] ?? "Adjunta el recurso correspondiente."}</p>
            </>
          )}
          {resourceFile && (type !== "video" || videoMode === "file") && (
            <div className={styles.fileBadge}>
              <span>{resourceFile.name}</span>
              <span>{formatFileSize(resourceFile.size)}</span>
            </div>
          )}
          {resourcePreview && (
            <img
              src={resourcePreview}
              alt="Vista previa del archivo seleccionado"
              className={styles.previewImage}
            />
          )}
        </div>
      )}
      {formError && <div className={styles.errorMsg}>{formError}</div>}
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
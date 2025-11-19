import {
  Schema,
  model,
  models,
  type Document,
  type Model,
  Types,
} from "mongoose";

/**
 * =============================
 * Tipos / Interfaces del modelo
 * =============================
 * Notas:
 * - Alineado al modelo de datos: `score` (double) y `xpAwarded` (int) son requeridos.
 * - Los contadores (`correctCount`, `totalCount`, `durationSec`) deben ser enteros ≥ 0.
 */
export interface ActivityAttemptAttrs {
  userId: Types.ObjectId;     // ref a User (requerido)
  activityId: Types.ObjectId; // ref a Activity (requerido)
  subjectId: Types.ObjectId;  // ref a Subject (requerido)

  score: number;              // requerido (double), min 0 (si usas escala 0..1 o 0..100, ajusta `max`)
  xpAwarded: number;          // requerido (int), min 0

  correctCount?: number;      // int ≥ 0, default 0
  totalCount?: number;        // int ≥ 0, default 0
  durationSec?: number;       // int ≥ 0, default 0 (duración del intento en segundos)
  status?: string | null;
  startedAt?: Date | null;
  endedAt?: Date | null;
}

export interface ActivityAttemptDocument
  extends Document,
    ActivityAttemptAttrs {
  createdAt: Date;            // solo creamos createdAt; no usamos updatedAt para esta colección
}

/** Conveniencia por si luego agregas estáticas/métodos */
export interface ActivityAttemptModel
  extends Model<ActivityAttemptDocument> {}

const isInt = (v: unknown) => Number.isInteger(v as number);

/**
 * ===========================
 * Definición del Schema
 * ===========================
 * - collection: "activity_attempts" (coincide con tu naming)
 * - timestamps: solo createdAt (updatedAt desactivado)
 * - versionKey: false (omitimos __v)
 */
const activityAttemptSchema = new Schema<
  ActivityAttemptDocument,
  ActivityAttemptModel
>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // queries por usuario
    },
    activityId: {
      type: Schema.Types.ObjectId,
      ref: "Activity",
      required: true,
      index: true, // queries por actividad
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true, // queries por materia
    },

    // ===== Requeridos por el modelo de datos =====
    score: {
      type: Number,
      required: true,
      min: 0,
      // Si tu dominio usa 0..1 o 0..100, puedes agregar `max`:
      // max: 1,
      // max: 100,
    },
    xpAwarded: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: isInt,
        message: "xpAwarded must be an integer",
      },
    },

    // ===== Opcionales con defaults seguros =====
    correctCount: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: isInt,
        message: "correctCount must be an integer",
      },
    },
    totalCount: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: isInt,
        message: "totalCount must be an integer",
      },
    },
    durationSec: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: isInt,
        message: "durationSec must be an integer",
      },
    },
    status: {
      type: String,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    collection: "activity_attempts",
  }
);

/**
 * ===========================
 * Validaciones de consistencia
 * ===========================
 * - No permitir más correctas que el total de preguntas.
 */
activityAttemptSchema.pre("validate", function (next) {
  if (
    typeof this.correctCount === "number" &&
    typeof this.totalCount === "number" &&
    this.correctCount > this.totalCount
  ) {
    this.invalidate(
      "correctCount",
      "correctCount cannot be greater than totalCount"
    );
  }
  next();
});

/**
 * ===========================
 * Índices compuestos útiles
 * ===========================
 * - Ordenar intentos recientes por user+activity y por user+subject.
 */
activityAttemptSchema.index({ userId: 1, activityId: 1, createdAt: -1 });
activityAttemptSchema.index({ userId: 1, subjectId: 1, createdAt: -1 });
activityAttemptSchema.index({ startedAt: 1 });
activityAttemptSchema.index({ endedAt: 1, status: 1 });

/**
 * ===========================
 * Salida limpia (toJSON)
 * ===========================
 * - expone `id` como string y oculta `_id`.
 */
activityAttemptSchema.set("toJSON", {
  transform: (_doc, ret: any) => {
    ret.id = ret._id?.toString();
    delete ret._id;
    return ret;
  },
});

/**
 * ===========================
 * Export del modelo
 * ===========================
 */
const ActivityAttempt =
  (models.ActivityAttempt as ActivityAttemptModel) ||
  model<ActivityAttemptDocument, ActivityAttemptModel>(
    "ActivityAttempt",
    activityAttemptSchema
  );

export default ActivityAttempt;

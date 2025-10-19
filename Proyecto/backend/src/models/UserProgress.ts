import {
  Schema,
  model,
  models,
  type Document,
  type Model,
  Types,
} from "mongoose";

/**
 * =========================================
 * UserProgress: progreso por usuario/materia
 * =========================================
 * - Un documento por (userId, subjectId).
 * - Acumula `xp` (int ≥ 0) y `unitsCompleted` (int ≥ 0).
 * - `lastActivityAt` fecha de última interacción (nullable).
 */

export interface UserProgressAttrs {
  userId: Types.ObjectId;        // ref a User (requerido)
  subjectId: Types.ObjectId;     // ref a Subject (requerido)
  unitsCompleted: number;        // int ≥ 0
  xp: number;                    // int ≥ 0
  lastActivityAt?: Date | null;  // null si aún no interactúa
}

export interface UserProgressDocument
  extends Document,
    UserProgressAttrs {
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProgressModel extends Model<UserProgressDocument> {
  /**
   * Incrementa XP de forma atómica (no permite negativo) y actualiza `lastActivityAt`.
   * Crea el doc si no existe (upsert).
   */
  awardXp(
    userId: Types.ObjectId,
    subjectId: Types.ObjectId,
    deltaXp: number,
    lastActivityAt?: Date
  ): Promise<void>;

  /**
   * Suma una unidad completada y opcionalmente XP, de forma atómica.
   */
  completeUnit(
    userId: Types.ObjectId,
    subjectId: Types.ObjectId,
    unitXp?: number,
    at?: Date
  ): Promise<void>;
}

const isInt = (v: unknown) => Number.isInteger(v as number);

// ========================
// Definición del Schema
// ========================
const userProgressSchema = new Schema<UserProgressDocument, UserProgressModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true,
    },
    unitsCompleted: {
      type: Number,
      default: 0,
      min: 0,
      validate: { validator: isInt, message: "unitsCompleted must be an integer" },
    },
    xp: {
      type: Number,
      default: 0,
      min: 0,
      validate: { validator: isInt, message: "xp must be an integer" },
    },
    lastActivityAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "users_progress",
  }
);

// ========================
// Índices
// ========================
// Un documento por usuario+materia
userProgressSchema.index({ userId: 1, subjectId: 1 }, { unique: true });
// Ranking por materia (leaderboards)
userProgressSchema.index({ subjectId: 1, xp: -1 });
// Actividad reciente por usuario
userProgressSchema.index({ userId: 1, updatedAt: -1 });

// ========================
// toJSON limpio
// ========================
userProgressSchema.set("toJSON", {
  transform: (_doc, ret: any) => {
    ret.id = ret._id?.toString();
    delete ret._id;
    return ret;
  },
});

// ========================
// Statics (helpers atómicos)
// ========================
userProgressSchema.statics.awardXp = async function (
  userId: Types.ObjectId,
  subjectId: Types.ObjectId,
  deltaXp: number,
  lastActivityAt?: Date
) {
  // Normaliza delta (si es negativo, nunca dejar XP < 0)
  const at = lastActivityAt ?? new Date();

  // Usamos update con pipeline para asegurar xp >= 0
  // Requiere MongoDB 4.2+ (pipeline en updates) — estándar hoy.
  await this.updateOne(
    { userId, subjectId },
    [
      {
        $set: {
          xp: {
            $max: [
              0,
              { $add: ["$xp", { $toInt: { $ifNull: [deltaXp, 0] } }] },
            ],
          },
          lastActivityAt: at,
          updatedAt: new Date(),
        },
      },
    ],
    { upsert: true }
  );
};

userProgressSchema.statics.completeUnit = async function (
  userId: Types.ObjectId,
  subjectId: Types.ObjectId,
  unitXp: number = 0,
  at?: Date
) {
  const now = at ?? new Date();

  await this.updateOne(
    { userId, subjectId },
    [
      {
        $set: {
          unitsCompleted: { $add: ["$unitsCompleted", 1] },
          xp: {
            $max: [
              0,
              { $add: ["$xp", { $toInt: { $ifNull: [unitXp, 0] } }] },
            ],
          },
          lastActivityAt: now,
          updatedAt: new Date(),
        },
      },
    ],
    { upsert: true }
  );
};

// ========================
// Export del modelo
// ========================
const UserProgress =
  (models.UserProgress as UserProgressModel) ||
  model<UserProgressDocument, UserProgressModel>(
    "UserProgress",
    userProgressSchema
  );

export default UserProgress;

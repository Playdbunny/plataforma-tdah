import {
  Schema,
  model,
  models,
  type Document,
  type Model,
  Types,
} from "mongoose";

/**
 * ===================================
 * XpEvent: ledger de XP / Coins (audit)
 * ===================================
 * - Cada documento es un movimiento atómico en la "cuenta" del usuario.
 * - `amount` puede ser positivo (abono) o negativo (cargo/ajuste).
 * - Usa `idempotencyKey` para evitar duplicados en reintentos.
 * - Campos de contexto (subject/activity/attempt) facilitan analytics.
 */

export type XpCurrency = "xp" | "coins";

export interface XpEventAttrs {
  userId: Types.ObjectId;          // ref: User (requerido)
  currency: XpCurrency;            // "xp" | "coins" (requerido)
  amount: number;                  // ENTERO ≠ 0 (positivo suma, negativo descuenta)
  source: string;                  // origen del evento (p.ej., "activity_attempt", "admin_adjustment")
  meta?: Record<string, unknown> | null; // datos adicionales (opcional)

  // ---- Contexto opcional para trazabilidad ----
  subjectId?: Types.ObjectId | null;      // ref: Subject
  activityId?: Types.ObjectId | null;     // ref: Activity
  attemptId?: Types.ObjectId | null;      // ref: ActivityAttempt

  // Idempotencia para evitar duplicar movimientos en reintentos
  idempotencyKey?: string | null;   // único si está presente
}

export interface XpEventDocument
  extends Document,
    XpEventAttrs {
  createdAt: Date;
}

export interface XpEventModel extends Model<XpEventDocument> {}

const isInt = (v: unknown) => Number.isInteger(v as number);

const xpEventSchema = new Schema<XpEventDocument, XpEventModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    currency: {
      type: String,
      enum: ["xp", "coins"],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      validate: [
        {
          validator: isInt,
          message: "amount must be an integer",
        },
        {
          // Evita movimientos nulos; si quieres permitir cero, elimina esta regla.
          validator: (v: number) => v !== 0,
          message: "amount cannot be zero",
        },
      ],
    },
    source: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      // Si quieres restringir a fuentes conocidas, usa enum y añade las que uses:
      // enum: ["activity_attempt", "admin_adjustment", "daily_bonus", "migration"],
      validate: {
        validator: (v: string) => /^[a-z0-9._-]{2,120}$/i.test(v.trim()),
        message:
          "source must be 2-120 chars (letters/numbers/dot/underscore/hyphen)",
      },
    },
    meta: {
      type: Schema.Types.Mixed,
      default: null,
    },

    // ---- Contexto opcional ----
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", default: null, index: true },
    activityId: { type: Schema.Types.ObjectId, ref: "Activity", default: null, index: true },
    attemptId:  { type: Schema.Types.ObjectId, ref: "ActivityAttempt", default: null, index: true },

    // Idempotencia para evitar duplicados (único si existe)
    idempotencyKey: {
      type: String,
      default: null,
      trim: true,
      maxlength: 120,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    collection: "xp_events",
  }
);

/**
 * ===========================
 * Índices recomendados
 * ===========================
 */
// Feed/consulta rápida por usuario y fecha descendente
xpEventSchema.index({ userId: 1, createdAt: -1 });

// Filtro por moneda (xp/coins) y recencia
xpEventSchema.index({ userId: 1, currency: 1, createdAt: -1 });

// Evita duplicar el mismo movimiento cuando reintentas (si proporcionas key)
xpEventSchema.index(
  { userId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } }
);

/**
 * ===========================
 * toJSON limpio
 * ===========================
 */
xpEventSchema.set("toJSON", {
  transform: (_doc, ret: any) => {
    ret.id = ret._id?.toString();
    delete ret._id;
    return ret;
  },
});

const XpEvent =
  (models.XpEvent as XpEventModel) ||
  model<XpEventDocument, XpEventModel>("XpEvent", xpEventSchema);

export default XpEvent;

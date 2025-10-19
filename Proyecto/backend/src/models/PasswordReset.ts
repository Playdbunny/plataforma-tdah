import {
  Schema,
  model,
  models,
  type Document,
  type Model,
  Types,
} from "mongoose";

/**
 * ======================================
 * PasswordReset: reset tokens one-time
 * ======================================
 * - Se guarda SOLO el hash del token (tokenHash), nunca el token plano.
 * - Un usuario puede tener como máximo un token activo (used:false).
 * - Los documentos expiran solos con un TTL index en `expiresAt`.
 * - Por defecto, no exponemos `tokenHash` en lecturas (select:false).
 */

export interface PasswordResetAttrs {
  userId: Types.ObjectId; // ref a User
  tokenHash: string;      // hash del token (p.ej. argon2/bcrypt/sha256 HMAC)
  expiresAt: Date;        // fecha de expiración absoluta
  used?: boolean;         // marcado al consumir el token
}

export interface PasswordResetDocument
  extends Document,
    PasswordResetAttrs {
  createdAt: Date;        // timestamp de creación
}

export interface PasswordResetModel
  extends Model<PasswordResetDocument> {}

/**
 * ===========================
 * Definición del Schema
 * ===========================
 * - timestamps: solo createdAt
 * - versionKey: false
 * - collection: "password_resets"
 */
const passwordResetSchema = new Schema<
  PasswordResetDocument,
  PasswordResetModel
>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Importante: no exponer este campo por defecto
    tokenHash: {
      type: String,
      required: true,
      trim: true,
      minlength: 20, // defensivo, ajusta según tu algoritmo de hash
      select: false, // <-- evita que se devuelva en consultas normales
      // Si quieres reforzar unicidad a nivel global por hash:
      // unique: true,  // (opcional) útil si tu hash incluye sal global/estable
    },

    // TTL index se define abajo con `index({ expiresAt: 1 }, { expireAfterSeconds: 0 })`
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    used: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    collection: "password_resets",
  }
);

/**
 * ===========================
 * Validaciones de negocio
 * ===========================
 * - `expiresAt` debe estar en el futuro cuando se crea.
 */
passwordResetSchema.pre("validate", function (next) {
  if (this.isNew && this.expiresAt && this.expiresAt.getTime() <= Date.now()) {
    this.invalidate("expiresAt", "expiresAt must be in the future");
  }
  next();
});

/**
 * ===========================
 * Índices
 * ===========================
 * - TTL: borra el doc en cuanto `expiresAt` se alcanza.
 * - Único parcial: un token activo por usuario (used:false).
 */
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Un token activo por usuario (permite múltiples históricos con used:true)
passwordResetSchema.index(
  { userId: 1, used: 1 },
  { unique: true, partialFilterExpression: { used: false } }
);

/**
 * ===========================
 * toJSON limpio
 * ===========================
 * - expone `id` y oculta `_id`.
 * - asegura que `tokenHash` no salga aunque lo hayan seleccionado.
 */
passwordResetSchema.set("toJSON", {
  transform: (_doc, ret: any) => {
    ret.id = ret._id?.toString();
    delete ret._id;
    delete ret.tokenHash;
    return ret;
  },
});

/**
 * ===========================
 * Export del modelo
 * ===========================
 */
const PasswordReset =
  (models.PasswordReset as PasswordResetModel) ||
  model<PasswordResetDocument, PasswordResetModel>(
    "PasswordReset",
    passwordResetSchema
  );

export default PasswordReset;

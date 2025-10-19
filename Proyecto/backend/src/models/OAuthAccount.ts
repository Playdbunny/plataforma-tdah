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
 * - Representa el vínculo entre un usuario local y su cuenta en un
 *   proveedor OAuth (Google, GitHub, etc.).
 */
export interface OAuthAccountAttrs {
  userId: Types.ObjectId;     // ref a User
  provider: string;           // p.ej. "google", "github"
  providerUserId: string;     // id externo del proveedor (sub, id, etc.)
}

export interface OAuthAccountDocument
  extends Document,
    OAuthAccountAttrs {
  createdAt: Date;            // solo createdAt; no actualizamos registros
}

/** Por si luego agregas estáticas/métodos */
export interface OAuthAccountModel
  extends Model<OAuthAccountDocument> {}

/**
 * ===========================
 * Definición del Schema
 * ===========================
 * - timestamps: solo createdAt (updatedAt desactivado)
 * - versionKey: false (omitimos __v)
 * - collection: "oauth_accounts" (naming claro en plural)
 */
const oAuthAccountSchema = new Schema<
  OAuthAccountDocument,
  OAuthAccountModel
>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Nombre del proveedor en minúsculas, sin espacios
    provider: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 50,
      // Si prefieres restringir a un set conocido, descomenta enum:
      // enum: ["google", "github", "microsoft", "apple", "facebook"],
      validate: {
        // evita valores vacíos tras trim y caracteres raros
        validator: (v: string) => /^[a-z0-9._-]{2,50}$/.test(v),
        message:
          "provider must be 2-50 chars (lowercase letters, digits, dot, underscore, hyphen)",
      },
    },

    // ID externo que entrega el proveedor (e.g. sub de Google)
    providerUserId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      validate: {
        validator: (v: string) => v.trim().length > 0,
        message: "providerUserId cannot be empty",
      },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    collection: "oauth_accounts",
  }
);

/**
 * ===========================
 * Índices y unicidad
 * ===========================
 * - Un usuario NO debería tener dos vínculos con el mismo proveedor.
 * - Un providerUserId NO puede mapear a más de un usuario.
 */

// (provider, providerUserId) debe ser único en toda la colección
oAuthAccountSchema.index({ provider: 1, providerUserId: 1 }, { unique: true });

// (userId, provider) único: un vínculo por proveedor por usuario
oAuthAccountSchema.index({ userId: 1, provider: 1 }, { unique: true });

/**
 * ===========================
 * toJSON limpio
 * ===========================
 * - expone `id` y oculta `_id` para respuestas más limpias.
 */
oAuthAccountSchema.set("toJSON", {
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
const OAuthAccount =
  (models.OAuthAccount as OAuthAccountModel) ||
  model<OAuthAccountDocument, OAuthAccountModel>(
    "OAuthAccount",
    oAuthAccountSchema
  );

export default OAuthAccount;

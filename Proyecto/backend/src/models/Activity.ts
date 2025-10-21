import {
  Schema,
  model,
  models,
  type Document,
  type Model,
  type HydratedDocument,
  Types,
} from "mongoose";

// ===== Tipos que usaremos =====
export type ActivityKind =
  | "multiple_choice"
  | "true_false"
  | "video_quiz"
  | "ppt_review"
  | "embedded_quiz";

export type OrientedAt = "inatento" | "hiperactivo" | "combinado" | null;

const BANNER_DATA_URL_REGEX =
  /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,[A-Za-z0-9+/=]+$/;
const MAX_BANNER_BYTES = 14 * 1024 * 1024; // ~14 MB en base64 (tamaño del string)

export interface ActivityAttrs {
  subjectId: Types.ObjectId;
  title: string;
  kind: ActivityKind;
  xpReward: number;
  config: Record<string, any>;

  unitOrder?: number;
  slug?: string;
  description?: string;
  orientedAt?: OrientedAt;
  status?: "draft" | "published";
  bannerUrl?: string | null;
  createdBy?: Types.ObjectId;
}

export interface ActivityDocument extends Document, ActivityAttrs {
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityModel extends Model<ActivityDocument> {
  findBySlug(
    subjectId: Types.ObjectId,
    slug: string
  ): Promise<HydratedDocument<ActivityDocument> | null>;
  paginate(
    filter: Record<string, unknown>,
    opts?: { page?: number; limit?: number; sort?: Record<string, 1 | -1> }
  ): Promise<{ items: ActivityDocument[]; total: number; page: number; pages: number }>;
}

// ===== Helpers =====
function toSlug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ===== Schema =====
const ActivitySchema = new Schema<ActivityDocument, ActivityModel>(
  {
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },

    // opcional para ordenar unidades/actividades dentro de la materia
    unitOrder: { type: Number, default: 0, min: 0 },

    kind: {
      type: String,
      required: true,
      enum: ["multiple_choice", "true_false", "video_quiz", "ppt_review", "embedded_quiz"],
    },

    title: { type: String, required: true, trim: true, maxlength: 160 },

    // slug NO es requerido por el jsonSchema original, pero es súper útil en FE
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      unique: false, // la unicidad real es por (subjectId, slug)
      validate: {
        validator: (v: string | undefined) =>
          v == null || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v),
        message: "Invalid slug format",
      },
    },

    description: { type: String, trim: true, maxlength: 1000 },

    // del jsonSchema: config objeto requerido
    config: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
      validate: {
        validator: (v: unknown) => v !== null && typeof v === "object",
        message: "config must be an object",
      },
    },

    xpReward: {
      type: Number,
      required: true,
      min: 0,
      max: 10000,
    },

    orientedAt: {
      type: String,
      enum: ["inatento", "hiperactivo", "combinado", null],
      default: null,
    },

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },

    bannerUrl: {
      type: String,
      default: null,
      set: (value: unknown) => {
        if (value == null) return null;
        if (typeof value !== "string") return value as any;
        const trimmed = value.trim();
        return trimmed.length ? trimmed : null;
      },
      validate: {
        validator(value: string | null) {
          if (value == null) return true;
          if (typeof value !== "string") return false;
          // si quieres permitir URLs http(s) además del dataURL, amplia esta validación:
          // return /^https?:\/\/\S+$/i.test(value) || (BANNER_DATA_URL_REGEX.test(value) && Buffer.byteLength(value,'utf8') <= MAX_BANNER_BYTES);
          if (!BANNER_DATA_URL_REGEX.test(value)) return false;
          return Buffer.byteLength(value, "utf8") <= MAX_BANNER_BYTES;
        },
        message: "Banner inválido o demasiado grande",
      },
    },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, versionKey: false, collection: "activities" }
);

// ===== Indexes =====
// Unicidad por materia+slug (siempre que el slug exista)
ActivitySchema.index({ subjectId: 1, slug: 1 }, { unique: true, sparse: true });
// Búsquedas por materia & orden
ActivitySchema.index({ subjectId: 1, unitOrder: 1 });
// Texto por título y descripción (útil para panel admin)
ActivitySchema.index({ title: "text", description: "text" }, { default_language: "spanish" });
// Ordenado reciente
ActivitySchema.index({ createdAt: -1 });

// ===== Hooks =====
ActivitySchema.pre("validate", function (next) {
  if (!this.slug && this.title) this.slug = toSlug(this.title);
  if (this.slug) this.slug = toSlug(this.slug);
  next();
});

// ===== toJSON =====
ActivitySchema.set("toJSON", {
  transform: (_doc, ret: any) => {
    ret.id = ret._id?.toString();
    delete ret._id;
    if (typeof ret.bannerUrl === "undefined") ret.bannerUrl = null;
    return ret;
  },
});

// ===== Statics =====
ActivitySchema.statics.findBySlug = function (subjectId: Types.ObjectId, slug: string) {
  return this.findOne({ subjectId, slug }).lean();
};

ActivitySchema.statics.paginate = async function (
  filter: Record<string, unknown>,
  opts?: { page?: number; limit?: number; sort?: Record<string, 1 | -1> }
) {
  const page = Math.max(1, opts?.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts?.limit ?? 20));
  const sort = opts?.sort ?? { createdAt: -1 };

  const [items, total] = await Promise.all([
    this.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    this.countDocuments(filter),
  ]);

  const pages = Math.max(1, Math.ceil(total / limit));
  return { items, total, page, pages };
};

// ===== Model =====
const Activity =
  (models.Activity as ActivityModel) ||
  model<ActivityDocument, ActivityModel>("Activity", ActivitySchema);

export default Activity;

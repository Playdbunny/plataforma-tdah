import {
  Schema,
  model,
  models,
  type Document,
  type Model,
  type HydratedDocument,
} from "mongoose";

// ---------- Types
export interface SubjectAttrs {
  name: string;
  slug?: string; // se autogenera si falta
  description?: string;
  bannerUrl?: string | null;
}

export interface SubjectDocument extends Document, SubjectAttrs {
  createdAt: Date;
  updatedAt: Date;
}

export interface SubjectModel extends Model<SubjectDocument> {
  findBySlug(slug: string): Promise<HydratedDocument<SubjectDocument> | null>;
  search(q: string, limit?: number): Promise<SubjectDocument[]>;
  paginate(
    filter: Record<string, unknown>,
    opts?: { page?: number; limit?: number; sort?: Record<string, 1 | -1> }
  ): Promise<{
    items: SubjectDocument[];
    total: number;
    page: number;
    pages: number;
  }>;
}

// ---------- Helpers
function toSlug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------- Schema
const subjectSchema = new Schema<SubjectDocument, SubjectModel>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 128,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      // el formato se valida solo si viene valor
      validate: {
        validator: (v: string | undefined) =>
          v == null || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v),
        message: "Invalid slug format",
      },
    },
    description: {
      type: String,
      trim: true,
      default: undefined,
      maxlength: 500,
    },
    bannerUrl: {
      type: String,
      default: null,
      // valida solo si trae string (no valida null/undefined)
      validate: {
        validator: (v: unknown) =>
          v == null || (typeof v === "string" && /^https?:\/\/\S+$/i.test(v)),
        message: "bannerUrl must be an absolute http(s) URL",
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "subjects",
  }
);

// ---------- Indexes
subjectSchema.index({ slug: 1 }, { unique: true, sparse: true });
subjectSchema.index(
  { name: "text", description: "text" },
  { default_language: "spanish", weights: { name: 5, description: 1 } }
);
subjectSchema.index({ createdAt: -1 });

// ---------- Hooks
subjectSchema.pre("validate", function (next) {
  if (!this.slug && this.name) this.slug = toSlug(this.name);
  if (this.slug) this.slug = toSlug(this.slug);
  next();
});

// ---------- toJSON limpio
subjectSchema.set("toJSON", {
  transform: (_doc, ret: any) => {
    ret.id = ret._id?.toString();
    delete ret._id;
    if (typeof ret.bannerUrl === "undefined") ret.bannerUrl = null;
    return ret;
  },
});

// ---------- Statics
subjectSchema.statics.findBySlug = function (slug: string) {
  return this.findOne({ slug }).lean();
};

subjectSchema.statics.search = function (q: string, limit = 10) {
  if (!q?.trim()) return Promise.resolve([]);
  return this.find({ $text: { $search: q } })
    .sort({ score: { $meta: "textScore" } })
    .limit(limit)
    .lean();
};

subjectSchema.statics.paginate = async function (
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

// ---------- Model
const Subject =
  (models.Subject as SubjectModel) ||
  model<SubjectDocument, SubjectModel>("Subject", subjectSchema);

export default Subject;

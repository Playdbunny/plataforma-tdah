import { Schema, model, models, type Document, type Model } from "mongoose";

export interface SubjectAttrs {
  name: string;
  slug: string;
  description?: string;
  bannerUrl?: string | null;
}

export interface SubjectDocument extends SubjectAttrs, Document {
  createdAt: Date;
  updatedAt: Date;
}

const subjectSchema = new Schema<SubjectDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 128,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
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
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

subjectSchema.index({ slug: 1 }, { unique: true });

subjectSchema.set("toJSON", {
  transform: (_doc, ret: Partial<SubjectDocument>) => {
    if (typeof ret.bannerUrl === "undefined") {
      ret.bannerUrl = null;
    }
    return ret;
  },
});

const Subject: Model<SubjectDocument> =
  (models.Subject as Model<SubjectDocument>) ||
  model<SubjectDocument>("Subject", subjectSchema, "subjects");

export default Subject;

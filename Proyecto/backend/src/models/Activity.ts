import { Schema, model, Document, Types } from 'mongoose';

type ActivityType = 'infografia' | 'quiz' | 'ppt-animada' | 'video' | 'juego';

const BANNER_DATA_URL_REGEX =
  /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,[A-Za-z0-9+/=]+$/;
const MAX_BANNER_BYTES = 14 * 1024 * 1024; // ~10 MB de imagen en base64

export interface IActivity extends Document {
  subjectId: Types.ObjectId;
  title: string;
  slug: string;
  type: ActivityType;
  description?: string;
  subjectSlug?: string;
  templateType: string;
  fieldsJSON: Record<string, any>;
  status: 'draft' | 'published';
  bannerUrl?: string | null;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    subjectSlug: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['infografia', 'quiz', 'ppt-animada', 'video', 'juego'],
      required: true,
      default: 'infografia',
    },
    description: { type: String, trim: true },
    templateType: { type: String, required: true },
    fieldsJSON: { type: Schema.Types.Mixed, required: true, default: {} },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    bannerUrl: {
      type: String,
      default: null,
      set: (value: unknown) => {
        if (value === null || typeof value === 'undefined') {
          return null;
        }
        if (typeof value !== 'string') {
          return value;
        }
        const trimmed = value.trim();
        return trimmed.length ? trimmed : null;
      },
      validate: {
        validator(value: string | null) {
          if (value === null || typeof value === 'undefined') {
            return true;
          }
          if (typeof value !== 'string') {
            return false;
          }
          if (!BANNER_DATA_URL_REGEX.test(value)) {
            return false;
          }
          return Buffer.byteLength(value, 'utf8') <= MAX_BANNER_BYTES;
        },
        message: 'Banner inválido o demasiado grande',
      },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

ActivitySchema.index({ subjectId: 1, slug: 1 }, { unique: true });

export default model<IActivity>('Activity', ActivitySchema);

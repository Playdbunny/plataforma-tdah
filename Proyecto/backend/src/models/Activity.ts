import { Schema, model, Document, Types } from 'mongoose';

type ActivityType = 'infografia' | 'quiz' | 'ppt-animada' | 'video' | 'juego';

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
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

ActivitySchema.index({ subjectId: 1, slug: 1 }, { unique: true });

export default model<IActivity>('Activity', ActivitySchema);

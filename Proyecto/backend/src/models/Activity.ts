import { Schema, model, Document, Types } from 'mongoose';

export interface IActivity extends Document {
  subjectId: Types.ObjectId;
  title: string;
  slug: string;
  templateType: string;
  fieldsJSON: Record<string, any>;
  status: 'draft' | 'published';
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ActivitySchema = new Schema<IActivity>({
  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
  title: { type: String, required: true },
  slug: { type: String, required: true },
  templateType: { type: String, required: true },
  fieldsJSON: { type: Schema.Types.Mixed, required: true },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ActivitySchema.index({ subjectId: 1, slug: 1 }, { unique: true });

export default model<IActivity>('Activity', ActivitySchema);

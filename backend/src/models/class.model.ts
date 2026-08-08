// ============================================================
// VIREON — CLASS (ONLINE SESSION) MONGOOSE MODEL
// ============================================================
import mongoose, { Schema, Document, Model } from 'mongoose';
import { ClassStatus } from '@vireon/shared';

export interface IClassDocument extends Document {
  title: string;
  subject: string;
  description?: string;
  courseId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  scheduledAt: Date;
  durationMinutes: number;
  zoomMeetingId?: string;
  zoomJoinUrl?: string;
  zoomPassword?: string;
  zoomHostUrl?: string;
  status: ClassStatus;
  attendees: mongoose.Types.ObjectId[];
  reminderSent: boolean;
  recordingUrl?: string;
  notes?: string;
  maxParticipants?: number;
  tags: string[];
}

const ClassSchema = new Schema<IClassDocument>(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 200 },
    subject: { type: String, required: true, trim: true, maxlength: 100, default: 'Industrial Safety' },
    description: { type: String, maxlength: 1000 },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: false },
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, min: 15, max: 480 },
    zoomMeetingId: { type: String },
    zoomJoinUrl: { type: String },
    zoomPassword: { type: String },
    zoomHostUrl: { type: String, select: false },
    status: {
      type: String,
      enum: Object.values(ClassStatus),
      default: ClassStatus.SCHEDULED,
    },
    attendees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    reminderSent: { type: Boolean, default: false },
    recordingUrl: { type: String },
    notes: { type: String, maxlength: 2000 },
    maxParticipants: { type: Number, min: 1 },
    tags: [{ type: String, trim: true }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform: (_doc, ret) => { if (ret.__v !== undefined) { delete (ret as Record<string, unknown>).__v; } delete ret.zoomHostUrl; return ret; } },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
ClassSchema.index({ scheduledAt: 1 });
ClassSchema.index({ status: 1, scheduledAt: 1 });
ClassSchema.index({ courseId: 1, status: 1 });
ClassSchema.index({ teacherId: 1, scheduledAt: 1 });
ClassSchema.index({ status: 1, reminderSent: 1 });

export const ClassModel: Model<IClassDocument> = mongoose.model<IClassDocument>(
  'Class',
  ClassSchema
);

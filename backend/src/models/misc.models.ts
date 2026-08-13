// ============================================================
// VIREON — OTP + CONTACT + REPORT MONGOOSE MODELS
// ============================================================
import mongoose, { Schema, Document, Model } from 'mongoose';
import { OtpPurpose, ContactStatus, ReportType } from '../shared';

// ─── OTP Model ────────────────────────────────────────────────────────────────
export interface IOtpDocument extends Document {
  identifier: string;
  code: string;
  purpose: OtpPurpose;
  expiresAt: Date;
  isUsed: boolean;
  attempts: number;
}

const OtpSchema = new Schema<IOtpDocument>(
  {
    identifier: { type: String, required: true, lowercase: true, trim: true },
    code: { type: String, required: true },
    purpose: { type: String, required: true, enum: Object.values(OtpPurpose) },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    isUsed: { type: Boolean, default: false },
    attempts: { type: Number, default: 0, max: 5 },
  },
  { timestamps: true }
);

OtpSchema.index({ identifier: 1, purpose: 1 });

export const OtpModel: Model<IOtpDocument> = mongoose.model<IOtpDocument>('Otp', OtpSchema);

// ─── Contact Model ────────────────────────────────────────────────────────────
export interface IContactDocument extends Document {
  name: string;
  email: string;
  phone: string;
  courseInterest?: string;
  message: string;
  status: ContactStatus;
  assignedTo?: mongoose.Types.ObjectId;
  notes?: string;
  ipAddress?: string;
}

const ContactSchema = new Schema<IContactDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    courseInterest: { type: String, trim: true },
    message: { type: String, required: true, minlength: 10, maxlength: 1000 },
    status: { type: String, enum: Object.values(ContactStatus), default: ContactStatus.NEW },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, maxlength: 1000 },
    ipAddress: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform: (_doc, ret) => { if (ret.__v !== undefined) { delete (ret as Record<string, unknown>).__v; } return ret; } },
  }
);

ContactSchema.index({ status: 1, createdAt: -1 });

export const ContactModel: Model<IContactDocument> = mongoose.model<IContactDocument>(
  'Contact',
  ContactSchema
);

// ─── Report Model ─────────────────────────────────────────────────────────────
export interface IReportDocument extends Document {
  reportType: ReportType;
  title: string;
  generatedBy: mongoose.Types.ObjectId;
  fileUrl?: string;
  filePublicId?: string;
  parameters?: Record<string, unknown>;
  data?: Record<string, unknown>;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
}

const ReportSchema = new Schema<IReportDocument>(
  {
    reportType: { type: String, required: true, enum: Object.values(ReportType) },
    title: { type: String, required: true, trim: true },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fileUrl: { type: String },
    filePublicId: { type: String },
    parameters: { type: Schema.Types.Mixed },
    data: { type: Schema.Types.Mixed },
    status: { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED'], default: 'PENDING' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform: (_doc, ret) => { if (ret.__v !== undefined) { delete (ret as Record<string, unknown>).__v; } return ret; } },
  }
);

ReportSchema.index({ reportType: 1, createdAt: -1 });
ReportSchema.index({ generatedBy: 1 });

export const ReportModel: Model<IReportDocument> = mongoose.model<IReportDocument>(
  'Report',
  ReportSchema
);

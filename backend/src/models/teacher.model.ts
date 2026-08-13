// ============================================================
// VIREON — TEACHER MONGOOSE MODEL
// ============================================================
import mongoose, { Schema, Document, Model } from 'mongoose';
import { TeacherCertification } from '../shared';

export interface ITeacherDocument extends Document {
  userId: mongoose.Types.ObjectId;
  designation: string;
  qualifications: Array<{
    degree: string;
    institution: string;
    year: number;
    specialization?: string;
  }>;
  specializations: string[];
  certifications: TeacherCertification[];
  experienceYears: number;
  bio: string;
  profileImageUrl?: string;
  profileImagePublicId?: string;
  assignedSubjects: string[];
  assignedCourses: mongoose.Types.ObjectId[];
  rating: number;
  totalReviews: number;
  isActive: boolean;
  isVerified: boolean;
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    youtube?: string;
    website?: string;
  };
}

const QualificationSchema = new Schema(
  {
    degree: { type: String, required: true, trim: true },
    institution: { type: String, required: true, trim: true },
    year: { type: Number, required: true, min: 1950, max: new Date().getFullYear() },
    specialization: { type: String, trim: true },
  },
  { _id: false }
);

const SocialLinksSchema = new Schema(
  {
    linkedin: { type: String },
    twitter: { type: String },
    youtube: { type: String },
    website: { type: String },
  },
  { _id: false }
);

const TeacherSchema = new Schema<ITeacherDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    designation: { type: String, required: true, trim: true, maxlength: 100 },
    qualifications: {
      type: [QualificationSchema],
      required: true,
      validate: [(val: unknown[]) => val.length > 0, 'At least one qualification required'],
    },
    specializations: [{ type: String, trim: true }],
    certifications: [{ type: String, enum: Object.values(TeacherCertification) }],
    experienceYears: { type: Number, default: 0, min: 0, max: 60 },
    bio: { type: String, required: true, minlength: 50, maxlength: 2000 },
    profileImageUrl: { type: String },
    profileImagePublicId: { type: String },
    assignedSubjects: [{ type: String, trim: true }],
    assignedCourses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    socialLinks: SocialLinksSchema,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform: (_doc, ret) => { if (ret.__v !== undefined) { delete (ret as Record<string, unknown>).__v; } return ret; } },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
TeacherSchema.index({ isActive: 1, isVerified: 1 });
TeacherSchema.index({ certifications: 1 });
TeacherSchema.index({ rating: -1 });
TeacherSchema.index({ '$**': 'text' });

export const TeacherModel: Model<ITeacherDocument> = mongoose.model<ITeacherDocument>(
  'Teacher',
  TeacherSchema
);

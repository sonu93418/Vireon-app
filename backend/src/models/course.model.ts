// ============================================================
// VIREON — COURSE MONGOOSE MODEL
// ============================================================
import mongoose, { Schema, Document, Model } from 'mongoose';
import slugify from 'slugify';
import { CourseLevel, CourseDurationType, SyllabusDomain } from '@vireon/shared';

export interface ICourseDocument extends Document {
  title: string;
  code: string;
  slug: string;
  level: CourseLevel;
  domain: SyllabusDomain;
  description: string;
  shortDescription: string;
  duration: number;
  durationType: CourseDurationType;
  eligibility: string[];
  highlights: string[];
  feeAmount: number;
  feeCurrency: string;
  discountedFee?: number;
  brochureUrl?: string;
  brochurePublicId?: string;
  syllabusPdfUrl?: string;
  syllabusPublicId?: string;
  thumbnailUrl?: string;
  thumbnailPublicId?: string;
  careerProspects: string[];
  certifications: string[];
  isPopular: boolean;
  isActive: boolean;
  isPlacementGuaranteed: boolean;
  enrollmentCount: number;
  assignedTeachers: mongoose.Types.ObjectId[];
  metaTitle?: string;
  metaDescription?: string;
}

const CourseSchema = new Schema<ICourseDocument>(
  {
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 200 },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    slug: { type: String, unique: true, lowercase: true },
    level: { type: String, required: true, enum: Object.values(CourseLevel) },
    domain: { type: String, required: true, enum: Object.values(SyllabusDomain) },
    description: { type: String, required: true, minlength: 100 },
    shortDescription: { type: String, required: true, minlength: 20, maxlength: 300 },
    duration: { type: Number, required: true, min: 1 },
    durationType: { type: String, required: true, enum: Object.values(CourseDurationType) },
    eligibility: [{ type: String, trim: true }],
    highlights: [{ type: String, trim: true }],
    feeAmount: { type: Number, required: true, min: 0 },
    feeCurrency: { type: String, default: 'INR' },
    discountedFee: { type: Number, min: 0 },
    brochureUrl: { type: String },
    brochurePublicId: { type: String },
    syllabusPdfUrl: { type: String },
    syllabusPublicId: { type: String },
    thumbnailUrl: { type: String },
    thumbnailPublicId: { type: String },
    careerProspects: [{ type: String, trim: true }],
    certifications: [{ type: String, trim: true }],
    isPopular: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isPlacementGuaranteed: { type: Boolean, default: false },
    enrollmentCount: { type: Number, default: 0 },
    assignedTeachers: [{ type: Schema.Types.ObjectId, ref: 'Teacher' }],
    metaTitle: { type: String, maxlength: 60 },
    metaDescription: { type: String, maxlength: 160 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform: (_doc, ret) => { if (ret.__v !== undefined) { delete (ret as Record<string, unknown>).__v; } return ret; } },
  }
);

// ─── Auto-generate slug ───────────────────────────────────────────────────────
CourseSchema.pre('save', function (next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

// ─── Indexes ──────────────────────────────────────────────────────────────────
CourseSchema.index({ slug: 1 });
CourseSchema.index({ level: 1, domain: 1 });
CourseSchema.index({ isPopular: 1, isActive: 1 });
CourseSchema.index({ feeAmount: 1 });
CourseSchema.index({ title: 'text', description: 'text', shortDescription: 'text' });

export const CourseModel: Model<ICourseDocument> = mongoose.model<ICourseDocument>(
  'Course',
  CourseSchema
);

// ============================================================
// VIREON — CMS PAGE MONGOOSE MODEL
// ============================================================
import mongoose, { Schema, Document, Model } from 'mongoose';
import { CmsPageSlug } from '@vireon/shared';

export interface ICmsPageDocument extends Document {
  slug: CmsPageSlug;
  title: string;
  contentJson: Record<string, unknown>;
  contentHtml: string;
  metaTitle?: string;
  metaDescription?: string;
  lastUpdatedBy: mongoose.Types.ObjectId;
  isPublished: boolean;
}

const CmsPageSchema = new Schema<ICmsPageDocument>(
  {
    slug: { type: String, required: true, unique: true, enum: Object.values(CmsPageSlug) },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    contentJson: { type: Schema.Types.Mixed, default: {} },
    contentHtml: { type: String, required: true },
    metaTitle: { type: String, maxlength: 60 },
    metaDescription: { type: String, maxlength: 160 },
    lastUpdatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isPublished: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform: (_doc, ret) => { if (ret.__v !== undefined) { delete (ret as Record<string, unknown>).__v; } return ret; } },
  }
);

CmsPageSchema.index({ slug: 1, isPublished: 1 });

export const CmsPageModel: Model<ICmsPageDocument> = mongoose.model<ICmsPageDocument>(
  'CmsPage',
  CmsPageSchema
);

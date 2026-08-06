// ============================================================
// VIREON — GALLERY MONGOOSE MODEL
// ============================================================
import mongoose, { Schema, Document, Model } from 'mongoose';
import { GalleryCategory, MediaType } from '@vireon/shared';

export interface IGalleryDocument extends Document {
  title: string;
  category: GalleryCategory;
  type: MediaType;
  mediaUrl: string;
  mediaPublicId: string;
  thumbnailUrl?: string;
  description?: string;
  eventDate?: Date;
  uploadedBy: mongoose.Types.ObjectId;
  isFeatured: boolean;
  sortOrder: number;
}

const GallerySchema = new Schema<IGalleryDocument>(
  {
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 200 },
    category: { type: String, required: true, enum: Object.values(GalleryCategory) },
    type: { type: String, required: true, enum: Object.values(MediaType) },
    mediaUrl: { type: String, required: true },
    mediaPublicId: { type: String, required: true },
    thumbnailUrl: { type: String },
    description: { type: String, maxlength: 500 },
    eventDate: { type: Date },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isFeatured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform: (_doc, ret) => { if (ret.__v !== undefined) { delete (ret as Record<string, unknown>).__v; } return ret; } },
  }
);

GallerySchema.index({ category: 1, type: 1 });
GallerySchema.index({ isFeatured: 1, sortOrder: 1 });
GallerySchema.index({ eventDate: -1 });

export const GalleryModel: Model<IGalleryDocument> = mongoose.model<IGalleryDocument>(
  'Gallery',
  GallerySchema
);

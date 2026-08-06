// ============================================================
// VIREON — UPLOAD METADATA MONGOOSE MODEL
// Tracks file upload history, Cloudinary public IDs, and users
// ============================================================
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUploadDocument extends Document {
  originalName: string;
  publicId: string;
  secureUrl: string;
  folder: string;
  resourceType: 'image' | 'video' | 'raw';
  mimeType: string;
  bytes: number;
  width?: number;
  height?: number;
  duration?: number;
  format?: string;
  uploadedBy: mongoose.Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UploadSchema = new Schema<IUploadDocument>(
  {
    originalName: { type: String, required: true, trim: true },
    publicId: { type: String, required: true, unique: true, index: true },
    secureUrl: { type: String, required: true },
    folder: { type: String, required: true, index: true },
    resourceType: { type: String, required: true, enum: ['image', 'video', 'raw'] },
    mimeType: { type: String, required: true },
    bytes: { type: Number, required: true },
    width: { type: Number },
    height: { type: Number },
    duration: { type: Number },
    format: { type: String },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        if (ret.__v !== undefined) { delete (ret as Record<string, unknown>).__v; }
        return ret;
      },
    },
  }
);

UploadSchema.index({ uploadedBy: 1, createdAt: -1 });
UploadSchema.index({ folder: 1, isDeleted: 1 });

export const UploadModel: Model<IUploadDocument> = mongoose.model<IUploadDocument>(
  'Upload',
  UploadSchema
);

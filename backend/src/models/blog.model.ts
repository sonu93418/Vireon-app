// ============================================================
// VIREON — BLOG MONGOOSE MODEL
// ============================================================
import mongoose, { Schema, Document, Model } from 'mongoose';
import slugify from 'slugify';
import { BlogCategory } from '@vireon/shared';

export interface IBlogDocument extends Document {
  title: string;
  slug: string;
  category: BlogCategory;
  content: string;
  excerpt: string;
  coverImageUrl?: string;
  coverImagePublicId?: string;
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  tags: string[];
  isPublished: boolean;
  publishedAt?: Date;
  viewsCount: number;
  bookmarkedBy: mongoose.Types.ObjectId[];
  readTimeMinutes: number;
  metaTitle?: string;
  metaDescription?: string;
  relatedPosts: mongoose.Types.ObjectId[];
}

const BlogSchema = new Schema<IBlogDocument>(
  {
    title: { type: String, required: true, trim: true, minlength: 10, maxlength: 200 },
    slug: { type: String, unique: true, lowercase: true },
    category: { type: String, required: true, enum: Object.values(BlogCategory) },
    content: { type: String, required: true, minlength: 100 },
    excerpt: { type: String, required: true, minlength: 20, maxlength: 300 },
    coverImageUrl: { type: String },
    coverImagePublicId: { type: String },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    tags: [{ type: String, trim: true, lowercase: true }],
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    viewsCount: { type: Number, default: 0 },
    bookmarkedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    readTimeMinutes: { type: Number, default: 1 },
    metaTitle: { type: String, maxlength: 60 },
    metaDescription: { type: String, maxlength: 160 },
    relatedPosts: [{ type: Schema.Types.ObjectId, ref: 'Blog' }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform: (_doc, ret) => { if (ret.__v !== undefined) { delete (ret as Record<string, unknown>).__v; } return ret; } },
  }
);

// ─── Auto-generate slug and calculate read time ───────────────────────────────
BlogSchema.pre('save', function (next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  if (this.isModified('content')) {
    const wordCount = this.content.replace(/<[^>]+>/g, '').split(/\s+/).length;
    this.readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));
  }
  if (this.isModified('isPublished') && this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// ─── Indexes ──────────────────────────────────────────────────────────────────
BlogSchema.index({ slug: 1 });
BlogSchema.index({ category: 1, isPublished: 1 });
BlogSchema.index({ publishedAt: -1 });
BlogSchema.index({ tags: 1 });
BlogSchema.index({ title: 'text', content: 'text', excerpt: 'text', tags: 'text' });

export const BlogModel: Model<IBlogDocument> = mongoose.model<IBlogDocument>(
  'Blog',
  BlogSchema
);

// ============================================================
// VIREON — NOTIFICATION MONGOOSE MODEL
// ============================================================
import mongoose, { Schema, Document, Model } from 'mongoose';
import { NotificationType, UserRole } from '../shared';

export interface INotificationDocument extends Document {
  recipientId?: mongoose.Types.ObjectId; // null = broadcast
  title: string;
  body: string;
  type: NotificationType;
  dataPayload?: Record<string, string>;
  imageUrl?: string;
  isRead: boolean;
  readAt?: Date;
  scheduledAt?: Date;
  sentAt?: Date;
  isSent: boolean;
  targetRoles?: UserRole[];
  deletedByUsers?: mongoose.Types.ObjectId[];
}

const NotificationSchema = new Schema<INotificationDocument>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    body: { type: String, required: true, trim: true, maxlength: 500 },
    type: { type: String, required: true, enum: Object.values(NotificationType) },
    dataPayload: { type: Schema.Types.Mixed },
    imageUrl: { type: String },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    scheduledAt: { type: Date },
    sentAt: { type: Date },
    isSent: { type: Boolean, default: false },
    targetRoles: [{ type: String, enum: Object.values(UserRole) }],
    deletedByUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform: (_doc, ret) => { if (ret.__v !== undefined) { delete (ret as Record<string, unknown>).__v; } return ret; } },
  }
);

NotificationSchema.index({ recipientId: 1, isRead: 1 });
NotificationSchema.index({ type: 1, isSent: 1 });
NotificationSchema.index({ scheduledAt: 1, isSent: 1 });
NotificationSchema.index({ createdAt: -1 });

export const NotificationModel: Model<INotificationDocument> = mongoose.model<INotificationDocument>(
  'Notification',
  NotificationSchema
);

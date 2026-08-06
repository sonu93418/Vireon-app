// ============================================================
// VIREON — USER MONGOOSE MODEL
// ============================================================
import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserRole, UserStatus } from '@vireon/shared';

export interface IUserDocument extends Document {
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  avatarPublicId?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  fcmTokens: string[];
  enrolledCourses: mongoose.Types.ObjectId[];
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    pinCode?: string;
  };
  dateOfBirth?: Date;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  lastLoginAt?: Date;
  refreshTokens: string[];
  tokenVersion: number;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const AddressSchema = new Schema(
  {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true, default: 'India' },
    pinCode: { type: String, match: /^\d{6}$/ },
  },
  { _id: false }
);

const UserSchema = new Schema<IUserDocument>(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Invalid Indian phone number'],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // never return in queries by default
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.STUDENT,
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.PENDING_VERIFICATION,
    },
    avatarUrl: { type: String },
    avatarPublicId: { type: String },
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    fcmTokens: [{ type: String }],
    enrolledCourses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
    address: AddressSchema,
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'] },
    lastLoginAt: { type: Date },
    refreshTokens: [{ type: String, select: false }],
    tokenVersion: { type: Number, default: 0, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        if (ret.passwordHash !== undefined) { delete (ret as Record<string, unknown>).passwordHash; }
        if (ret.refreshTokens !== undefined) { delete (ret as Record<string, unknown>).refreshTokens; }
        if (ret.tokenVersion !== undefined) { delete (ret as Record<string, unknown>).tokenVersion; }
        if (ret.__v !== undefined) { delete (ret as Record<string, unknown>).__v; }
        return ret;
      },
    },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
UserSchema.index({ email: 1 });
UserSchema.index({ phone: 1 });
UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ '$**': 'text' }); // full-text search

// ─── Instance Methods ─────────────────────────────────────────────────────────
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash as string);
};

export const UserModel: Model<IUserDocument> = mongoose.model<IUserDocument>(
  'User',
  UserSchema
);

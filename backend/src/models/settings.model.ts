// ============================================================
// VIREON — SETTINGS MONGOOSE MODEL
// ============================================================
import mongoose, { Schema, Document, Model } from 'mongoose';
import { IsoCertification } from '../shared';

export interface ISettingsDocument extends Document {
  instituteName: string;
  tagline: string;
  email: string;
  phone: string[];
  whatsappNumber?: string;
  websiteUrl: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    pinCode?: string;
  };
  googleMapsUrl?: string;
  mcaRegNo?: string;
  msmeRegNo?: string;
  nsdmRegNo?: string;
  isoCertifications: IsoCertification[];
  logoUrl?: string;
  faviconUrl?: string;
  bannerImages: Array<{
    imageUrl: string;
    imagePublicId: string;
    title?: string;
    subtitle?: string;
    ctaText?: string;
    ctaLink?: string;
    isActive: boolean;
    sortOrder: number;
  }>;
  placementStats: {
    placedStudents: number;
    recruitingCompanies: number;
    averagePackage: number;
    highestPackage: number;
    placementRate: number;
  };
  socialLinks: {
    linkedin?: string;
    twitter?: string;
    youtube?: string;
    website?: string;
  };
}

const BannerSchema = new Schema(
  {
    imageUrl: { type: String, required: true },
    imagePublicId: { type: String, required: true },
    title: { type: String },
    subtitle: { type: String },
    ctaText: { type: String },
    ctaLink: { type: String },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false }
);

const SettingsSchema = new Schema<ISettingsDocument>(
  {
    instituteName: { type: String, default: 'Vireon Safety Institute' },
    tagline: { type: String, default: 'A Govt. Registered & ISO Certified Institute for Industrial Safety Education' },
    email: { type: String, default: 'info@vireonsafety.in' },
    phone: [{ type: String }],
    whatsappNumber: { type: String },
    websiteUrl: { type: String, default: 'https://vireonsafety.in' },
    address: {
      street: { type: String },
      city: { type: String, default: 'Dighwara' },
      state: { type: String, default: 'Bihar' },
      country: { type: String, default: 'India' },
      pinCode: { type: String },
    },
    googleMapsUrl: { type: String },
    mcaRegNo: { type: String },
    msmeRegNo: { type: String },
    nsdmRegNo: { type: String },
    isoCertifications: [{ type: String, enum: Object.values(IsoCertification) }],
    logoUrl: { type: String },
    faviconUrl: { type: String },
    bannerImages: [BannerSchema],
    placementStats: {
      placedStudents: { type: Number, default: 0 },
      recruitingCompanies: { type: Number, default: 0 },
      averagePackage: { type: Number, default: 0 },
      highestPackage: { type: Number, default: 0 },
      placementRate: { type: Number, default: 100 },
    },
    socialLinks: {
      linkedin: { type: String },
      twitter: { type: String },
      youtube: { type: String },
      website: { type: String },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform: (_doc, ret) => { if (ret.__v !== undefined) { delete (ret as Record<string, unknown>).__v; } return ret; } },
  }
);

export const SettingsModel: Model<ISettingsDocument> = mongoose.model<ISettingsDocument>(
  'Settings',
  SettingsSchema
);

// ============================================================
// VIREON SAFETY INSTITUTE — SHARED INTERFACES
// Platform-wide TypeScript interface definitions
// ============================================================

import {
  BlogCategory,
  ClassStatus,
  CmsPageSlug,
  ContactStatus,
  CourseDurationType,
  CourseLevel,
  GalleryCategory,
  IsoCertification,
  MediaType,
  NotificationType,
  OtpPurpose,
  ReportType,
  SyllabusDomain,
  TeacherCertification,
  UserRole,
  UserStatus,
} from '../enums';

// ─── Base Interface ─────────────────────────────────────────────────────────

export interface BaseDocument {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── User ───────────────────────────────────────────────────────────────────

export interface IUser extends BaseDocument {
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
  enrolledCourses: string[]; // refs to course _id
  address?: IAddress;
  dateOfBirth?: Date;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  lastLoginAt?: Date;
  refreshTokens: string[];
}

export interface IAddress {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  pinCode?: string;
}

// ─── Teacher ─────────────────────────────────────────────────────────────────

export interface ITeacher extends BaseDocument {
  userId: string; // ref to User
  designation: string;
  qualifications: IQualification[];
  specializations: string[];
  certifications: TeacherCertification[];
  experienceYears: number;
  bio: string;
  profileImageUrl?: string;
  profileImagePublicId?: string;
  assignedSubjects: string[];
  assignedCourses: string[]; // refs to course _id
  rating: number;
  totalReviews: number;
  isActive: boolean;
  isVerified: boolean;
  socialLinks?: ISocialLinks;
  upcomingClasses?: string[]; // refs to class _id
}

export interface IQualification {
  degree: string;
  institution: string;
  year: number;
  specialization?: string;
}

export interface ISocialLinks {
  linkedin?: string;
  twitter?: string;
  youtube?: string;
  website?: string;
}

// ─── Course ──────────────────────────────────────────────────────────────────

export interface ICourse extends BaseDocument {
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
  assignedTeachers: string[]; // refs to teacher _id
  metaTitle?: string;
  metaDescription?: string;
}

// ─── Class (Online Session) ───────────────────────────────────────────────────

export interface IClass extends BaseDocument {
  title: string;
  subject: string;
  description?: string;
  courseId: string; // ref to Course
  teacherId: string; // ref to Teacher
  scheduledAt: Date;
  durationMinutes: number;
  zoomMeetingId?: string;
  zoomJoinUrl?: string;
  zoomPassword?: string;
  zoomHostUrl?: string;
  status: ClassStatus;
  attendees: string[]; // refs to User _id
  reminderSent: boolean;
  recordingUrl?: string;
  notes?: string;
  maxParticipants?: number;
  tags: string[];
}

// ─── Blog ─────────────────────────────────────────────────────────────────────

export interface IBlog extends BaseDocument {
  title: string;
  slug: string;
  category: BlogCategory;
  content: string; // HTML content from rich text editor
  excerpt: string;
  coverImageUrl?: string;
  coverImagePublicId?: string;
  authorId: string; // ref to User (Admin/Teacher)
  authorName: string;
  tags: string[];
  isPublished: boolean;
  publishedAt?: Date;
  viewsCount: number;
  bookmarkedBy: string[]; // refs to User _id
  readTimeMinutes: number;
  metaTitle?: string;
  metaDescription?: string;
  relatedPosts: string[]; // refs to Blog _id
}

// ─── Gallery ──────────────────────────────────────────────────────────────────

export interface IGallery extends BaseDocument {
  title: string;
  category: GalleryCategory;
  type: MediaType;
  mediaUrl: string;
  mediaPublicId: string;
  thumbnailUrl?: string;
  description?: string;
  eventDate?: Date;
  uploadedBy: string; // ref to User
  isFeatured: boolean;
  sortOrder: number;
}

// ─── CMS Page ─────────────────────────────────────────────────────────────────

export interface ICmsPage extends BaseDocument {
  slug: CmsPageSlug;
  title: string;
  contentJson: Record<string, unknown>; // structured content blocks
  contentHtml: string;
  metaTitle?: string;
  metaDescription?: string;
  lastUpdatedBy: string; // ref to User
  isPublished: boolean;
}

// ─── Notification ─────────────────────────────────────────────────────────────

export interface INotification extends BaseDocument {
  recipientId?: string; // null = broadcast to ALL
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
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface ISettings extends BaseDocument {
  instituteName: string;
  tagline: string;
  email: string;
  phone: string[];
  whatsappNumber?: string;
  websiteUrl: string;
  address: IAddress;
  googleMapsUrl?: string;
  mcaRegNo?: string;
  msmeRegNo?: string;
  nsdmRegNo?: string;
  isoCertifications: IsoCertification[];
  logoUrl?: string;
  faviconUrl?: string;
  bannerImages: IBannerImage[];
  placementStats: IPlacementStats;
  socialLinks: ISocialLinks;
  heroVideos: string[];
}

export interface IBannerImage {
  imageUrl: string;
  imagePublicId: string;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface IPlacementStats {
  placedStudents: number;
  recruitingCompanies: number;
  averagePackage: number;
  highestPackage: number;
  placementRate: number;
}

// ─── Report ───────────────────────────────────────────────────────────────────

export interface IReport extends BaseDocument {
  reportType: ReportType;
  title: string;
  generatedBy: string; // ref to User
  fileUrl?: string;
  filePublicId?: string;
  parameters?: Record<string, unknown>;
  data?: Record<string, unknown>;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
}

// ─── Contact ──────────────────────────────────────────────────────────────────

export interface IContact extends BaseDocument {
  name: string;
  email: string;
  phone: string;
  courseInterest?: string;
  message: string;
  status: ContactStatus;
  assignedTo?: string; // ref to User
  notes?: string;
  ipAddress?: string;
}

// ─── OTP ──────────────────────────────────────────────────────────────────────

export interface IOtp extends BaseDocument {
  identifier: string; // email or phone
  code: string; // hashed OTP
  purpose: OtpPurpose;
  expiresAt: Date;
  isUsed: boolean;
  attempts: number;
}

// ─── API Response Wrapper ─────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: IPaginationMeta;
  errors?: IValidationError[];
}

export interface IPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface IValidationError {
  field: string;
  message: string;
}

export interface IPaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

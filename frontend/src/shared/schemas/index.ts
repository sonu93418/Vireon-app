// ============================================================
// VIREON SAFETY INSTITUTE — SHARED ZOD VALIDATION SCHEMAS
// All Zod schemas used across server and client
// ============================================================

import { z } from 'zod';
import {
  BlogCategory,
  ClassStatus,
  CmsPageSlug,
  CourseDurationType,
  CourseLevel,
  GalleryCategory,
  MediaType,
  NotificationType,
  OtpPurpose,
  ReportType,
  SyllabusDomain,
  TeacherCertification,
  UserRole,
} from '../enums';

// ─── Common ──────────────────────────────────────────────────────────────────

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId');

export const phoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number (10 digits starting with 6-9)');

export const emailSchema = z.string().email('Invalid email address').toLowerCase();

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ─── Auth Schemas ─────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  role: z.nativeEnum(UserRole).optional().default(UserRole.STUDENT),
});

export const loginWithEmailSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  fcmToken: z.string().optional(),
});

export const loginWithPhoneSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, 'Password is required'),
  fcmToken: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const verifyOtpSchema = z.object({
  identifier: z.union([emailSchema, phoneSchema]),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  purpose: z.nativeEnum(OtpPurpose),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// ─── User Schemas ─────────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).trim().optional(),
  phone: phoneSchema.optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  dateOfBirth: z.string().datetime().optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      pinCode: z.string().regex(/^\d{6}$/).optional(),
    })
    .optional(),
});

// ─── Teacher Schemas ──────────────────────────────────────────────────────────

export const createTeacherSchema = z.object({
  userId: objectIdSchema,
  designation: z.string().min(2).max(100).trim(),
  qualifications: z
    .array(
      z.object({
        degree: z.string().min(1),
        institution: z.string().min(1),
        year: z.number().int().min(1950).max(new Date().getFullYear()),
        specialization: z.string().optional(),
      })
    )
    .min(1, 'At least one qualification is required'),
  specializations: z.array(z.string().trim()).min(1),
  certifications: z.array(z.nativeEnum(TeacherCertification)),
  experienceYears: z.number().int().min(0).max(60),
  bio: z.string().min(50, 'Bio must be at least 50 characters').max(2000),
  assignedSubjects: z.array(z.string().trim()).min(1),
  assignedCourses: z.array(objectIdSchema),
  socialLinks: z
    .object({
      linkedin: z.string().url().optional(),
      twitter: z.string().url().optional(),
      youtube: z.string().url().optional(),
      website: z.string().url().optional(),
    })
    .optional(),
});

export const updateTeacherSchema = createTeacherSchema.partial().omit({ userId: true });

// ─── Course Schemas ───────────────────────────────────────────────────────────

export const createCourseSchema = z.object({
  title: z.string().min(5).max(200).trim(),
  code: z.string().min(2).max(20).toUpperCase().trim(),
  level: z.nativeEnum(CourseLevel),
  domain: z.nativeEnum(SyllabusDomain),
  description: z.string().min(100, 'Description must be at least 100 characters'),
  shortDescription: z.string().min(20).max(300),
  duration: z.number().int().min(1),
  durationType: z.nativeEnum(CourseDurationType),
  eligibility: z.array(z.string().trim()).min(1),
  highlights: z.array(z.string().trim()),
  feeAmount: z.number().min(0),
  feeCurrency: z.string().default('INR'),
  discountedFee: z.number().min(0).optional(),
  careerProspects: z.array(z.string().trim()),
  certifications: z.array(z.string().trim()),
  isPopular: z.boolean().default(false),
  isPlacementGuaranteed: z.boolean().default(false),
  assignedTeachers: z.array(objectIdSchema),
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional(),
});

export const updateCourseSchema = createCourseSchema.partial();

// ─── Class Schemas ────────────────────────────────────────────────────────────

export const createClassSchema = z.object({
  title: z.string().min(5).max(200).trim(),
  subject: z.string().min(2).max(100).trim(),
  description: z.string().max(1000).optional(),
  courseId: objectIdSchema,
  teacherId: objectIdSchema,
  scheduledAt: z.string().datetime({ message: 'Invalid datetime format' }),
  durationMinutes: z.number().int().min(15).max(480),
  zoomMeetingId: z.string().optional(),
  zoomJoinUrl: z.string().url().optional(),
  zoomPassword: z.string().optional(),
  zoomHostUrl: z.string().url().optional(),
  maxParticipants: z.number().int().min(1).optional(),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string().trim()),
});

export const updateClassSchema = createClassSchema.partial();

export const updateClassStatusSchema = z.object({
  status: z.nativeEnum(ClassStatus),
  recordingUrl: z.string().url().optional(),
});

// ─── Blog Schemas ─────────────────────────────────────────────────────────────

export const createBlogSchema = z.object({
  title: z.string().min(10).max(200).trim(),
  category: z.nativeEnum(BlogCategory),
  content: z.string().min(100, 'Content must be at least 100 characters'),
  excerpt: z.string().min(20).max(300).trim(),
  tags: z.array(z.string().trim()),
  isPublished: z.boolean().default(false),
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional(),
  relatedPosts: z.array(objectIdSchema).optional(),
});

export const updateBlogSchema = createBlogSchema.partial();

// ─── Gallery Schemas ──────────────────────────────────────────────────────────

export const createGallerySchema = z.object({
  title: z.string().min(2).max(200).trim(),
  category: z.nativeEnum(GalleryCategory),
  type: z.nativeEnum(MediaType),
  description: z.string().max(500).optional(),
  eventDate: z.string().datetime().optional(),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateGallerySchema = createGallerySchema.partial();

// ─── CMS Schemas ──────────────────────────────────────────────────────────────

export const updateCmsPageSchema = z.object({
  title: z.string().min(2).max(200).trim(),
  contentJson: z.record(z.unknown()),
  contentHtml: z.string(),
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional(),
  isPublished: z.boolean().default(true),
});

// ─── Notification Schemas ─────────────────────────────────────────────────────

export const sendNotificationSchema = z.object({
  title: z.string().min(1).max(100).trim(),
  body: z.string().min(1).max(500).trim(),
  type: z.nativeEnum(NotificationType),
  recipientId: objectIdSchema.optional(), // null = broadcast
  dataPayload: z.record(z.string()).optional(),
  imageUrl: z.string().url().optional(),
  scheduledAt: z.string().datetime().optional(),
  targetRoles: z.array(z.nativeEnum(UserRole)).optional(),
});

// ─── Contact Schemas ──────────────────────────────────────────────────────────

export const createContactSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: emailSchema,
  phone: phoneSchema,
  courseInterest: z.string().optional(),
  message: z.string().min(10, 'Message must be at least 10 characters').max(1000),
});

// ─── Report Schemas ───────────────────────────────────────────────────────────

export const generateReportSchema = z.object({
  reportType: z.nativeEnum(ReportType),
  parameters: z
    .object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      courseId: objectIdSchema.optional(),
      teacherId: objectIdSchema.optional(),
    })
    .optional(),
});

// ─── Settings Schemas ─────────────────────────────────────────────────────────

export const updateSettingsSchema = z.object({
  instituteName: z.string().min(2).max(200).trim().optional(),
  tagline: z.string().max(300).optional(),
  email: emailSchema.optional(),
  phone: z.array(phoneSchema).optional(),
  whatsappNumber: phoneSchema.optional(),
  websiteUrl: z.string().url().optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      pinCode: z.string().regex(/^\d{6}$/).optional(),
    })
    .optional(),
  googleMapsUrl: z.string().url().optional(),
  mcaRegNo: z.string().optional(),
  msmeRegNo: z.string().optional(),
  nsdmRegNo: z.string().optional(),
  socialLinks: z
    .object({
      linkedin: z.string().url().optional(),
      twitter: z.string().url().optional(),
      youtube: z.string().url().optional(),
      website: z.string().url().optional(),
    })
    .optional(),
  placementStats: z
    .object({
      placedStudents: z.number().int().min(0),
      recruitingCompanies: z.number().int().min(0),
      averagePackage: z.number().min(0),
      highestPackage: z.number().min(0),
      placementRate: z.number().min(0).max(100),
    })
    .optional(),
});

// ─── Export type helpers ──────────────────────────────────────────────────────

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginWithEmailInput = z.infer<typeof loginWithEmailSchema>;
export type LoginWithPhoneInput = z.infer<typeof loginWithPhoneSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>;
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
export type CreateBlogInput = z.infer<typeof createBlogSchema>;
export type UpdateBlogInput = z.infer<typeof updateBlogSchema>;
export type CreateGalleryInput = z.infer<typeof createGallerySchema>;
export type UpdateGalleryInput = z.infer<typeof updateGallerySchema>;
export type UpdateCmsPageInput = z.infer<typeof updateCmsPageSchema>;
export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type GenerateReportInput = z.infer<typeof generateReportSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type PaginationQuery = z.infer<typeof paginationSchema>;

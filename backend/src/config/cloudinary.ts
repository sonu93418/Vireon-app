// ============================================================
// VIREON — CLOUDINARY CONFIGURATION
// ============================================================
import { v2 as cloudinary } from 'cloudinary';
import { logger } from './logger';

export const configureCloudinary = (): void => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary credentials are missing from environment variables');
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });

  logger.info('✅ Cloudinary configured successfully');
};

export { cloudinary };

// ─── Upload Folders (Configurable & Standardized) ──────────────────────────────
export const CLOUDINARY_FOLDERS = {
  TEACHERS: 'vireon/teachers',
  COURSES: 'vireon/courses',
  GALLERY: 'vireon/gallery',
  BLOGS: 'vireon/blogs',
  BANNERS: 'vireon/banners',
  STUDENTS: 'vireon/students',
  CERTIFICATES: 'vireon/certificates',
  SYLLABUS: 'vireon/syllabus',
  VIDEOS: 'vireon/videos',
  DOCUMENTS: 'vireon/documents',
  AVATARS: 'vireon/avatars',
  SYLLABI: 'vireon/syllabi',
  BROCHURES: 'vireon/brochures',
  LOGOS: 'vireon/logos',
  REPORTS: 'vireon/reports',
} as const;

export type CloudinaryFolder = typeof CLOUDINARY_FOLDERS[keyof typeof CLOUDINARY_FOLDERS] | string;

// ─── Resource Type Config ─────────────────────────────────────────────────────
export const CLOUDINARY_RESOURCE_TYPES = {
  IMAGE: 'image',
  VIDEO: 'video',
  PDF: 'raw',
  DOCUMENT: 'raw',
} as const;

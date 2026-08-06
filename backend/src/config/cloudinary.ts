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

// ─── Upload Folders ───────────────────────────────────────────────────────────
export const CLOUDINARY_FOLDERS = {
  AVATARS: 'vireon/avatars',
  TEACHERS: 'vireon/teachers',
  COURSES: 'vireon/courses',
  SYLLABI: 'vireon/syllabi',
  BROCHURES: 'vireon/brochures',
  GALLERY_IMAGES: 'vireon/gallery/images',
  GALLERY_VIDEOS: 'vireon/gallery/videos',
  BLOG_COVERS: 'vireon/blogs',
  BANNERS: 'vireon/banners',
  REPORTS: 'vireon/reports',
  LOGOS: 'vireon/logos',
} as const;

// ─── Resource Type Config ─────────────────────────────────────────────────────
export const CLOUDINARY_RESOURCE_TYPES = {
  IMAGE: 'image',
  VIDEO: 'video',
  PDF: 'raw',
} as const;

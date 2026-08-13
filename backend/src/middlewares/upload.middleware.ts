// ============================================================
// VIREON — UPLOAD MIDDLEWARE (Multer Memory Storage)
// File size limits, MIME type validations, and buffer streaming
// ============================================================
import multer from 'multer';
import { Request } from 'express';
import { BadRequestError } from '../core/errors';

// Memory storage — files are held in buffer and streamed to Cloudinary
const memoryStorage = multer.memoryStorage();

// Allowed MIME types per category
const ALLOWED_MIME_TYPES = {
  IMAGE: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'],
  PDF: ['application/pdf'],
  VIDEO: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
  DOCUMENT: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'application/x-zip-compressed',
  ],
};

// File Filter Function
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allAllowed = [
    ...ALLOWED_MIME_TYPES.IMAGE,
    ...ALLOWED_MIME_TYPES.PDF,
    ...ALLOWED_MIME_TYPES.VIDEO,
    ...ALLOWED_MIME_TYPES.DOCUMENT,
  ];

  if (allAllowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new BadRequestError(
        `Unsupported file format (${file.mimetype}). Allowed: images, PDFs, videos, office documents, ZIP.`
      )
    );
  }
};

/**
 * General Multer Upload Middleware (Max 200 MB for videos, 20 MB for docs, 10 MB for images)
 */
export const uploadMiddleware = multer({
  storage: memoryStorage,
  fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200 MB max for video uploads
  },
});

/**
 * Image Specific Upload Middleware (10 MB limit)
 */
export const uploadImageMiddleware = multer({
  storage: memoryStorage,
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (ALLOWED_MIME_TYPES.IMAGE.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestError(`Unsupported image format (${file.mimetype}). Allowed: JPEG, PNG, WebP, GIF, SVG.`));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

/**
 * PDF Specific Upload Middleware (20 MB limit)
 */
export const uploadPdfMiddleware = multer({
  storage: memoryStorage,
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (ALLOWED_MIME_TYPES.PDF.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestError(`Unsupported file format (${file.mimetype}). Only PDF files allowed.`));
    }
  },
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

/**
 * Video Specific Upload Middleware (200 MB limit)
 */
export const uploadVideoMiddleware = multer({
  storage: memoryStorage,
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (ALLOWED_MIME_TYPES.VIDEO.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestError(`Unsupported video format (${file.mimetype}). Allowed: MP4, WebM, MOV, AVI.`));
    }
  },
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
});

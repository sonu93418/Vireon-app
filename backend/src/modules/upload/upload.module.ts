// ============================================================
// VIREON — UPLOAD MODULE (Cloudinary Signed Upload)
// ============================================================
import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { uploadRateLimiter } from '../../middlewares/rateLimiter.middleware';
import { ResponseHandler } from '../../core/response';
import { BadRequestError } from '../../core/errors';
import { UserRole } from '@vireon/shared';
import {
  uploadImage,
  uploadPdf,
  uploadVideo,
  deleteMedia,
  generateSignedUploadParams,
} from '../../utils/cloudinary.util';
import { CLOUDINARY_FOLDERS } from '../../config/cloudinary';

// Multer: store in memory for Cloudinary stream upload
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, '/tmp/vireon-uploads');
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4', 'video/webm'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestError('Invalid file type. Allowed: jpeg, png, webp, pdf, mp4, webm'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
});

const router = Router();

// ─── Generate signed upload params (for client-side direct upload) ─────────────
router.get('/sign', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), (req: Request, res: Response, next: NextFunction) => {
  try {
    const folder = (req.query.folder as string) ?? CLOUDINARY_FOLDERS.GALLERY_IMAGES;
    const resourceType = (req.query.type as 'image' | 'video' | 'raw') ?? 'image';
    const params = generateSignedUploadParams(folder, resourceType);
    ResponseHandler.success(res, params, 'Signed upload parameters generated');
  } catch (e) { next(e); }
});

// ─── Server-side upload handlers ─────────────────────────────────────────────
router.post('/image', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), uploadRateLimiter, upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new BadRequestError('No file uploaded');
    const folder = (req.body as Record<string, string>).folder ?? CLOUDINARY_FOLDERS.GALLERY_IMAGES;
    const result = await uploadImage(req.file.path, folder as string);
    ResponseHandler.created(res, result, 'Image uploaded successfully');
  } catch (e) { next(e); }
});

router.post('/pdf', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), uploadRateLimiter, upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new BadRequestError('No file uploaded');
    if (req.file.mimetype !== 'application/pdf') throw new BadRequestError('Only PDF files allowed');
    const folder = (req.body as Record<string, string>).folder ?? CLOUDINARY_FOLDERS.SYLLABI;
    const result = await uploadPdf(req.file.path, folder as string);
    ResponseHandler.created(res, result, 'PDF uploaded successfully');
  } catch (e) { next(e); }
});

router.post('/video', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), uploadRateLimiter, upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new BadRequestError('No file uploaded');
    const folder = (req.body as Record<string, string>).folder ?? CLOUDINARY_FOLDERS.GALLERY_VIDEOS;
    const result = await uploadVideo(req.file.path, folder as string);
    ResponseHandler.created(res, result, 'Video uploaded successfully');
  } catch (e) { next(e); }
});

router.delete('/', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { publicId, resourceType = 'image' } = req.body as { publicId: string; resourceType: 'image' | 'video' | 'raw' };
    if (!publicId) throw new BadRequestError('publicId is required');
    const deleted = await deleteMedia(publicId, resourceType);
    if (!deleted) throw new BadRequestError('Failed to delete media');
    ResponseHandler.success(res, null, 'Media deleted successfully');
  } catch (e) { next(e); }
});

export default router;

// ============================================================
// VIREON — PRODUCTION CLOUDINARY UPLOAD MODULE
// Reusable Upload Service for Images, PDFs, Videos & Documents
// ============================================================
import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { authenticate, authorize, optionalAuthenticate } from '../../middlewares/auth.middleware';
import { uploadRateLimiter } from '../../middlewares/rateLimiter.middleware';
import {
  uploadMiddleware,
  uploadImageMiddleware,
  uploadPdfMiddleware,
  uploadVideoMiddleware,
} from '../../middlewares/upload.middleware';
import { ResponseHandler } from '../../core/response';
import { BadRequestError, NotFoundError } from '../../core/errors';
import { UserRole } from '@vireon/shared';
import {
  uploadImageBuffer,
  uploadPdfBuffer,
  uploadVideoBuffer,
  uploadDocumentBuffer,
  deleteMedia,
  replaceMedia,
  generateSignedUploadParams,
  UploadResult,
} from '../../utils/cloudinary.util';
import { CLOUDINARY_FOLDERS } from '../../config/cloudinary';
import { UploadModel } from '../../models/upload.model';
import { logger } from '../../config/logger';

const router = Router();

// Helper to save upload metadata to MongoDB
const saveUploadMetadata = async (
  result: UploadResult,
  file: Express.Multer.File,
  folder: string,
  userId: string
) => {
  return UploadModel.create({
    originalName: file.originalname,
    publicId: result.publicId,
    secureUrl: result.secureUrl,
    folder,
    resourceType: result.resourceType,
    mimeType: file.mimetype,
    bytes: result.bytes,
    width: result.width,
    height: result.height,
    duration: result.duration,
    format: result.format,
    uploadedBy: new mongoose.Types.ObjectId(userId),
  });
};

/**
 * @swagger
 * /api/v1/upload/signature:
 *   get:
 *     tags: [Upload]
 *     summary: Generate signed parameters for direct Cloudinary upload
 */
router.get('/signature', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const folder = (req.query.folder as string) ?? CLOUDINARY_FOLDERS.GALLERY;
    const resourceType = (req.query.type as 'image' | 'video' | 'raw') ?? 'image';
    const params = generateSignedUploadParams(folder, resourceType);
    ResponseHandler.success(res, params, 'Signed upload parameters generated');
  } catch (e) { next(e); }
});

// Backward compatibility alias `/sign`
router.get('/sign', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const folder = (req.query.folder as string) ?? CLOUDINARY_FOLDERS.GALLERY;
    const resourceType = (req.query.type as 'image' | 'video' | 'raw') ?? 'image';
    const params = generateSignedUploadParams(folder, resourceType);
    ResponseHandler.success(res, params, 'Signed upload parameters generated');
  } catch (e) { next(e); }
});

/**
 * @swagger
 * /api/v1/upload/image:
 *   post:
 *     tags: [Upload]
 *     summary: Upload an image (JPEG, PNG, WebP) -> WebP optimized
 */
router.post(
  '/image',
  authenticate,
  uploadRateLimiter,
  uploadImageMiddleware.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new BadRequestError('No image file provided');
      const folder = (req.body as Record<string, string>).folder ?? CLOUDINARY_FOLDERS.GALLERY;

      const result = await uploadImageBuffer(req.file.buffer, folder);
      const record = await saveUploadMetadata(result, req.file, folder, req.user!.userId);

      logger.info(`✅ Image uploaded by user ${req.user!.userId}: ${result.publicId}`);
      ResponseHandler.created(res, record, 'Image uploaded and optimized successfully');
    } catch (e) { next(e); }
  }
);

/**
 * @swagger
 * /api/v1/upload/pdf:
 *   post:
 *     tags: [Upload]
 *     summary: Upload a PDF document
 */
router.post(
  '/pdf',
  authenticate,
  uploadRateLimiter,
  uploadPdfMiddleware.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new BadRequestError('No PDF file provided');
      const folder = (req.body as Record<string, string>).folder ?? CLOUDINARY_FOLDERS.SYLLABUS;

      const result = await uploadPdfBuffer(req.file.buffer, folder);
      const record = await saveUploadMetadata(result, req.file, folder, req.user!.userId);

      logger.info(`✅ PDF uploaded by user ${req.user!.userId}: ${result.publicId}`);
      ResponseHandler.created(res, record, 'PDF uploaded successfully');
    } catch (e) { next(e); }
  }
);

/**
 * @swagger
 * /api/v1/upload/video:
 *   post:
 *     tags: [Upload]
 *     summary: Upload a video (MP4, WebM, MOV)
 */
router.post(
  '/video',
  authenticate,
  uploadRateLimiter,
  uploadVideoMiddleware.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new BadRequestError('No video file provided');
      const folder = (req.body as Record<string, string>).folder ?? CLOUDINARY_FOLDERS.VIDEOS;

      const result = await uploadVideoBuffer(req.file.buffer, folder);
      const record = await saveUploadMetadata(result, req.file, folder, req.user!.userId);

      logger.info(`✅ Video uploaded by user ${req.user!.userId}: ${result.publicId}`);
      ResponseHandler.created(res, record, 'Video uploaded successfully');
    } catch (e) { next(e); }
  }
);

/**
 * @swagger
 * /api/v1/upload/document:
 *   post:
 *     tags: [Upload]
 *     summary: Upload a document (Word, Excel, PowerPoint, ZIP)
 */
router.post(
  '/document',
  authenticate,
  uploadRateLimiter,
  uploadMiddleware.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new BadRequestError('No document file provided');
      const folder = (req.body as Record<string, string>).folder ?? CLOUDINARY_FOLDERS.DOCUMENTS;

      const result = await uploadDocumentBuffer(req.file.buffer, folder);
      const record = await saveUploadMetadata(result, req.file, folder, req.user!.userId);

      logger.info(`✅ Document uploaded by user ${req.user!.userId}: ${result.publicId}`);
      ResponseHandler.created(res, record, 'Document uploaded successfully');
    } catch (e) { next(e); }
  }
);

/**
 * @swagger
 * /api/v1/upload/multiple:
 *   post:
 *     tags: [Upload]
 *     summary: Upload multiple files (up to 10 files)
 */
router.post(
  '/multiple',
  authenticate,
  uploadRateLimiter,
  uploadMiddleware.array('files', 10),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) throw new BadRequestError('No files provided');

      const folder = (req.body as Record<string, string>).folder ?? CLOUDINARY_FOLDERS.GALLERY;

      const uploadPromises = files.map(async (file) => {
        let result: UploadResult;
        if (file.mimetype.startsWith('image/')) {
          result = await uploadImageBuffer(file.buffer, folder);
        } else if (file.mimetype === 'application/pdf') {
          result = await uploadPdfBuffer(file.buffer, folder);
        } else if (file.mimetype.startsWith('video/')) {
          result = await uploadVideoBuffer(file.buffer, folder);
        } else {
          result = await uploadDocumentBuffer(file.buffer, folder);
        }
        return saveUploadMetadata(result, file, folder, req.user!.userId);
      });

      const records = await Promise.all(uploadPromises);
      ResponseHandler.created(res, records, `${records.length} files uploaded successfully`);
    } catch (e) { next(e); }
  }
);

/**
 * @swagger
 * /api/v1/upload/replace:
 *   patch:
 *     tags: [Upload]
 *     summary: Replace an existing uploaded file by publicId
 */
router.patch(
  '/replace',
  authenticate,
  uploadRateLimiter,
  uploadMiddleware.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new BadRequestError('No new file provided for replacement');
      const { publicId, folder = CLOUDINARY_FOLDERS.GALLERY, resourceType = 'image' } = req.body as {
        publicId: string;
        folder?: string;
        resourceType?: 'image' | 'video' | 'raw';
      };

      if (!publicId) throw new BadRequestError('publicId is required to replace file');

      const result = await replaceMedia(publicId, req.file.buffer, folder, resourceType);

      // Update MongoDB record
      await UploadModel.findOneAndUpdate(
        { publicId },
        {
          publicId: result.publicId,
          secureUrl: result.secureUrl,
          originalName: req.file.originalname,
          bytes: result.bytes,
          mimeType: req.file.mimetype,
          width: result.width,
          height: result.height,
          duration: result.duration,
          updatedAt: new Date(),
        }
      );

      ResponseHandler.success(res, result, 'File replaced successfully');
    } catch (e) { next(e); }
  }
);

/**
 * @swagger
 * /api/v1/upload/{publicId}:
 *   delete:
 *     tags: [Upload]
 *     summary: Delete uploaded file by publicId
 */
router.delete(
  '/:publicId(*)',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { publicId } = req.params;
      const resourceType = (req.query.type as 'image' | 'video' | 'raw') ?? 'image';

      if (!publicId) throw new BadRequestError('publicId is required');

      const deleted = await deleteMedia(publicId, resourceType);
      if (!deleted) throw new BadRequestError('Failed to delete media from Cloudinary');

      // Soft delete in MongoDB
      await UploadModel.findOneAndUpdate(
        { publicId },
        { isDeleted: true, deletedAt: new Date() }
      );

      logger.info(`🗑️ Media deleted by admin ${req.user!.userId}: ${publicId}`);
      ResponseHandler.success(res, null, 'Media deleted successfully');
    } catch (e) { next(e); }
  }
);

/**
 * @swagger
 * /api/v1/upload/my:
 *   get:
 *     tags: [Upload]
 *     summary: Get upload history for logged-in user
 */
router.get('/my', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uploads = await UploadModel.find({ uploadedBy: req.user!.userId, isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(50);
    ResponseHandler.success(res, uploads, 'Upload history fetched');
  } catch (e) { next(e); }
});

/**
 * @swagger
 * /api/v1/upload/all:
 *   get:
 *     tags: [Upload]
 *     summary: Get all public uploads (PDFs, docs) visible to all authenticated users
 */
router.get('/all', optionalAuthenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uploads = await UploadModel.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(100)
      .select('-__v');
    ResponseHandler.success(res, uploads, 'All resources fetched');
  } catch (e) { next(e); }
});

export default router;

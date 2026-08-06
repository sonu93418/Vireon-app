// ============================================================
// VIREON — CLOUDINARY STREAM UPLOAD UTILITY
// Memory-buffered stream uploads, WebP optimization & signed URLs
// ============================================================
import { UploadApiResponse } from 'cloudinary';
import streamifier from 'streamifier';
import { cloudinary, CLOUDINARY_FOLDERS } from '../config/cloudinary';
import { logger } from '../config/logger';
import { InternalServerError, BadRequestError } from '../core/errors';

export interface UploadResult {
  publicId: string;
  secureUrl: string;
  format: string;
  width?: number;
  height?: number;
  bytes: number;
  duration?: number;
  resourceType: 'image' | 'video' | 'raw';
}

/**
 * Low-level stream upload helper using streamifier
 */
const uploadStream = (
  buffer: Buffer,
  options: Record<string, unknown>
): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error || !result) {
        logger.error('❌ Cloudinary stream upload error:', error);
        return reject(new InternalServerError('Cloudinary upload stream failed'));
      }
      resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

/**
 * Upload Image Buffer with automatic WebP conversion & quality optimization
 */
export const uploadImageBuffer = async (
  buffer: Buffer,
  folder: string = CLOUDINARY_FOLDERS.AVATARS,
  transformationOptions: Record<string, unknown> = {}
): Promise<UploadResult> => {
  try {
    const result = await uploadStream(buffer, {
      folder,
      resource_type: 'image',
      quality: 'auto',
      fetch_format: 'auto',
      overwrite: false,
      unique_filename: true,
      ...transformationOptions,
    });

    return {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      resourceType: 'image',
    };
  } catch (error) {
    logger.error('❌ Cloudinary image upload error:', error);
    throw new InternalServerError('Failed to upload image to Cloudinary');
  }
};

/**
 * Upload PDF Buffer using raw resource_type
 */
export const uploadPdfBuffer = async (
  buffer: Buffer,
  folder: string = CLOUDINARY_FOLDERS.SYLLABUS
): Promise<UploadResult> => {
  try {
    const result = await uploadStream(buffer, {
      folder,
      resource_type: 'raw',
      overwrite: false,
      unique_filename: true,
    });

    return {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      format: result.format || 'pdf',
      bytes: result.bytes,
      resourceType: 'raw',
    };
  } catch (error) {
    logger.error('❌ Cloudinary PDF upload error:', error);
    throw new InternalServerError('Failed to upload PDF to Cloudinary');
  }
};

/**
 * Upload Video Buffer with automatic quality & transcoding
 */
export const uploadVideoBuffer = async (
  buffer: Buffer,
  folder: string = CLOUDINARY_FOLDERS.VIDEOS
): Promise<UploadResult> => {
  try {
    const result = await uploadStream(buffer, {
      folder,
      resource_type: 'video',
      quality: 'auto',
      overwrite: false,
      unique_filename: true,
    });

    return {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      duration: result.duration,
      resourceType: 'video',
    };
  } catch (error) {
    logger.error('❌ Cloudinary video upload error:', error);
    throw new InternalServerError('Failed to upload video to Cloudinary');
  }
};

/**
 * Upload Office Document / Zip Buffer (raw resource_type)
 */
export const uploadDocumentBuffer = async (
  buffer: Buffer,
  folder: string = CLOUDINARY_FOLDERS.DOCUMENTS
): Promise<UploadResult> => {
  try {
    const result = await uploadStream(buffer, {
      folder,
      resource_type: 'raw',
      overwrite: false,
      unique_filename: true,
    });

    return {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      format: result.format || 'doc',
      bytes: result.bytes,
      resourceType: 'raw',
    };
  } catch (error) {
    logger.error('❌ Cloudinary document upload error:', error);
    throw new InternalServerError('Failed to upload document to Cloudinary');
  }
};

/**
 * Delete media from Cloudinary by publicId
 */
export const deleteMedia = async (
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<boolean> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });
    return (result as { result?: string }).result === 'ok';
  } catch (error) {
    logger.error('❌ Cloudinary delete error:', error);
    return false;
  }
};

/**
 * Replace media in Cloudinary (deletes old publicId and uploads new buffer)
 */
export const replaceMedia = async (
  oldPublicId: string,
  newBuffer: Buffer,
  folder: string,
  resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<UploadResult> => {
  if (oldPublicId) {
    await deleteMedia(oldPublicId, resourceType);
  }

  if (resourceType === 'video') {
    return uploadVideoBuffer(newBuffer, folder);
  } else if (resourceType === 'raw') {
    return uploadDocumentBuffer(newBuffer, folder);
  } else {
    return uploadImageBuffer(newBuffer, folder);
  }
};

/**
 * Generate signed upload parameters for direct client uploads
 */
export const generateSignedUploadParams = (
  folder: string = CLOUDINARY_FOLDERS.GALLERY,
  resourceType: 'image' | 'video' | 'raw' = 'image'
): { signature: string; timestamp: number; apiKey: string; cloudName: string; folder: string } => {
  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    process.env.CLOUDINARY_API_SECRET ?? ''
  );

  return {
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    folder,
  };
};

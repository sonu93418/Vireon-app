// ============================================================
// VIREON — CLOUDINARY UPLOAD UTILITY
// Secure signed uploads and file management
// ============================================================
import { UploadApiResponse, DeleteApiResponse } from 'cloudinary';
import { cloudinary, CLOUDINARY_FOLDERS } from '../config/cloudinary';
import { logger } from '../config/logger';
import { InternalServerError } from '../core/errors';

export interface UploadResult {
  publicId: string;
  secureUrl: string;
  format: string;
  width?: number;
  height?: number;
  bytes: number;
  resourceType: string;
}

export const uploadImage = async (
  filePath: string,
  folder: string = CLOUDINARY_FOLDERS.AVATARS,
  options: Record<string, unknown> = {}
): Promise<UploadResult> => {
  try {
    const result: UploadApiResponse = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'image',
      quality: 'auto',
      fetch_format: 'auto',
      ...options,
    });

    return {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      resourceType: result.resource_type,
    };
  } catch (error) {
    logger.error('❌ Cloudinary image upload failed:', error);
    throw new InternalServerError('Failed to upload image');
  }
};

export const uploadPdf = async (
  filePath: string,
  folder: string = CLOUDINARY_FOLDERS.SYLLABI
): Promise<UploadResult> => {
  try {
    const result: UploadApiResponse = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'raw',
    });

    return {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      format: result.format,
      bytes: result.bytes,
      resourceType: result.resource_type,
    };
  } catch (error) {
    logger.error('❌ Cloudinary PDF upload failed:', error);
    throw new InternalServerError('Failed to upload PDF');
  }
};

export const uploadVideo = async (
  filePath: string,
  folder: string = CLOUDINARY_FOLDERS.GALLERY_VIDEOS
): Promise<UploadResult> => {
  try {
    const result: UploadApiResponse = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'video',
      quality: 'auto',
    });

    return {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      format: result.format,
      bytes: result.bytes,
      resourceType: result.resource_type,
    };
  } catch (error) {
    logger.error('❌ Cloudinary video upload failed:', error);
    throw new InternalServerError('Failed to upload video');
  }
};

export const deleteMedia = async (
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<boolean> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return (result as { result?: string }).result === 'ok';
  } catch (error) {
    logger.error('❌ Cloudinary delete failed:', error);
    return false;
  }
};

export const generateSignedUploadParams = (
  folder: string,
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

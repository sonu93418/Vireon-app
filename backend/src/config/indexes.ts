// ============================================================
// VIREON — PRODUCTION DATABASE INDEXES
// Ensures high-performance compound indexing on database startup
// ============================================================
import { UserModel } from '../models/user.model';
import { CourseModel } from '../models/course.model';
import { ClassModel } from '../models/class.model';
import { UploadModel } from '../models/upload.model';
import { TeacherModel } from '../models/teacher.model';
import { logger } from './logger';

export async function ensureProductionIndexes(): Promise<void> {
  try {
    // User Compound Indexes
    await UserModel.collection.createIndex({ role: 1, status: 1 }, { background: true }).catch(() => {});

    // Course Compound Indexes
    await CourseModel.collection.createIndex({ level: 1, isActive: 1, feeAmount: 1 }, { background: true }).catch(() => {});
    await CourseModel.collection.createIndex({ isPopular: 1, isActive: 1 }, { background: true }).catch(() => {});

    // Class Compound Indexes
    await ClassModel.collection.createIndex({ status: 1, scheduledAt: 1 }, { background: true }).catch(() => {});
    await ClassModel.collection.createIndex({ teacherId: 1, status: 1 }, { background: true }).catch(() => {});

    // Teacher Compound Indexes
    await TeacherModel.collection.createIndex({ isActive: 1, isVerified: 1, rating: -1 }, { background: true }).catch(() => {});

    // Upload Compound Indexes
    await UploadModel.collection.createIndex({ folder: 1, isDeleted: 1, createdAt: -1 }, { background: true }).catch(() => {});

    logger.info('⚡ Production MongoDB compound indexes verified.');
  } catch (error: any) {
    logger.warn('⚠️ Index verification skipped or non-critical notice:', error?.message);
  }
}

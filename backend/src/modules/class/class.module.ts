// ============================================================
// VIREON — CLASS MODULE (Online Sessions)
// ============================================================
import { Router, Request, Response, NextFunction } from 'express';
import { Model } from 'mongoose';
import { z } from 'zod';
import { ClassModel, IClassDocument } from '../../models/class.model';
import { BaseRepository } from '../../core/base.repository';
import { ResponseHandler } from '../../core/response';
import { NotFoundError } from '../../core/errors';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createClassSchema,
  updateClassSchema,
  updateClassStatusSchema,
  paginationSchema,
  objectIdSchema,
} from '@vireon/shared/schemas';
import { UserRole, ClassStatus, NotificationType } from '@vireon/shared';
import { NotificationModel } from '../../models/notification.model';
import { UserModel } from '../../models/user.model';
import { getFirebaseMessaging } from '../../config/firebase';
import { logger } from '../../config/logger';

// ─── Repository ───────────────────────────────────────────────────────────────
class ClassRepository extends BaseRepository<IClassDocument> {
  constructor() {
    super(ClassModel as Model<IClassDocument>);
  }
  async findTodaysClasses(): Promise<IClassDocument[]> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    return ClassModel.find({
      scheduledAt: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: [ClassStatus.SCHEDULED, ClassStatus.LIVE] },
    })
      .select('title subject description scheduledAt durationMinutes zoomJoinUrl status teacherId courseId')
      .populate('teacherId', 'designation profileImageUrl userId')
      .populate('courseId', 'title code level')
      .sort({ scheduledAt: 1 })
      .lean()
      .exec() as unknown as Promise<IClassDocument[]>;
  }
  async findUpcoming(limit = 10): Promise<IClassDocument[]> {
    return ClassModel.find({
      scheduledAt: { $gte: new Date() },
      status: ClassStatus.SCHEDULED,
    })
      .select('title subject description scheduledAt durationMinutes zoomJoinUrl status teacherId courseId')
      .populate('teacherId', 'designation profileImageUrl userId')
      .populate('courseId', 'title code level')
      .sort({ scheduledAt: 1 })
      .limit(limit)
      .lean()
      .exec() as unknown as Promise<IClassDocument[]>;
  }
  async findPendingReminders(): Promise<IClassDocument[]> {
    const now = new Date();
    const in30Min = new Date(now.getTime() + 30 * 60 * 1000);
    return ClassModel.find({
      scheduledAt: { $gte: now, $lte: in30Min },
      status: ClassStatus.SCHEDULED,
      reminderSent: false,
    })
      .populate('attendees', 'fcmTokens email fullName')
      .lean()
      .exec() as unknown as Promise<IClassDocument[]>;
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────
class ClassService {
  private repo = new ClassRepository();

  async getAll(query: Record<string, unknown>) {
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.courseId) filter.courseId = query.courseId;
    if (query.teacherId) filter.teacherId = query.teacherId;
    return this.repo.findAll(filter, query as Parameters<ClassRepository['findAll']>[1], [
      { path: 'teacherId', select: 'designation profileImageUrl userId' },
      { path: 'courseId', select: 'title code level' },
    ]);
  }
  async getToday() { return this.repo.findTodaysClasses(); }
  async getUpcoming(limit?: number) { return this.repo.findUpcoming(limit); }
  async getById(id: string) {
    const cls = await this.repo.findById(id, [
      { path: 'teacherId', populate: { path: 'userId', select: 'fullName avatarUrl' } },
      { path: 'courseId', select: 'title code level' },
    ]);
    if (!cls) throw new NotFoundError('Class');
    return cls;
  }
  async create(data: Record<string, unknown>) {
    const cls = await this.repo.create(data as Partial<IClassDocument>);

    try {
      const scheduledDateStr = new Date(cls.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const scheduledTimeStr = new Date(cls.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

      const notifTitle = `📅 New Class Scheduled: ${cls.title}`;
      const notifBody = `Scheduled for ${scheduledDateStr} at ${scheduledTimeStr}. Tap to view schedule!`;

      await NotificationModel.create({
        title: notifTitle,
        body: notifBody,
        type: NotificationType.CLASS_REMINDER,
        dataPayload: { classId: String(cls._id), zoomJoinUrl: cls.zoomJoinUrl ?? '' },
        isSent: true,
        sentAt: new Date(),
      });

      const users = await UserModel.find({ status: { $ne: 'SUSPENDED' }, fcmTokens: { $exists: true, $not: { $size: 0 } } }).select('fcmTokens').lean();
      const tokens = users.flatMap((u) => u.fcmTokens ?? []).filter(Boolean);

      if (tokens.length > 0) {
        const messaging = getFirebaseMessaging();
        await messaging.sendEachForMulticast({
          tokens,
          notification: { title: notifTitle, body: notifBody },
          data: {
            type: NotificationType.CLASS_REMINDER,
            classId: String(cls._id),
            zoomJoinUrl: cls.zoomJoinUrl ?? '',
          },
          android: {
            priority: 'high',
            notification: {
              channelId: 'vireon_alerts_v3',
              visibility: 'public',
              priority: 'max',
              defaultSound: true,
              defaultVibrateTimings: true,
            },
          },
          apns: {
            headers: { 'apns-priority': '10' },
            payload: {
              aps: { sound: 'default', badge: 1, contentAvailable: true },
            },
          },
        });
        logger.info(`✅ Broadcast lock screen push sent for scheduled class: ${cls.title}`);
      }
    } catch (err) {
      logger.error('❌ Failed to send push for new scheduled class:', err);
    }

    return cls;
  }
  async update(id: string, data: Record<string, unknown>) {
    const updated = await this.repo.updateById(id, data);
    if (!updated) throw new NotFoundError('Class');
    return updated;
  }
  async updateStatus(id: string, data: Record<string, unknown>) {
    const updated = await this.repo.updateById(id, data);
    if (!updated) throw new NotFoundError('Class');

    if (data.status === ClassStatus.LIVE || data.status === 'LIVE') {
      try {
        const notifTitle = `🚨 LIVE NOW: ${updated.title}`;
        const notifBody = `The live session for ${updated.subject} is live right now! Tap to join session.`;

        await NotificationModel.create({
          title: notifTitle,
          body: notifBody,
          type: NotificationType.CLASS_STARTED,
          dataPayload: { classId: String(updated._id), zoomJoinUrl: updated.zoomJoinUrl ?? '' },
          isSent: true,
          sentAt: new Date(),
        });

        const users = await UserModel.find({ status: { $ne: 'SUSPENDED' }, fcmTokens: { $exists: true, $not: { $size: 0 } } }).select('fcmTokens').lean();
        const tokens = users.flatMap((u) => u.fcmTokens ?? []).filter(Boolean);

        if (tokens.length > 0) {
          const messaging = getFirebaseMessaging();
          await messaging.sendEachForMulticast({
            tokens,
            notification: { title: notifTitle, body: notifBody },
            data: {
              type: NotificationType.CLASS_STARTED,
              classId: String(updated._id),
              zoomJoinUrl: updated.zoomJoinUrl ?? '',
            },
            android: {
              priority: 'high',
              notification: {
                channelId: 'vireon_alerts_v3',
                visibility: 'public',
                priority: 'max',
                defaultSound: true,
                defaultVibrateTimings: true,
              },
            },
            apns: {
              headers: { 'apns-priority': '10' },
              payload: {
                aps: { sound: 'default', badge: 1, contentAvailable: true },
              },
            },
          });
          logger.info(`✅ Lock screen push sent for LIVE class: ${updated.title}`);
        }
      } catch (err) {
        logger.error('❌ Failed to send push for LIVE status update:', err);
      }
    }

    return updated;
  }
  async delete(id: string) { await this.repo.softDeleteById(id); }
  async addAttendee(classId: string, userId: string) {
    return this.repo.updateById(classId, { $addToSet: { attendees: userId } });
  }
}

// ─── Controller ───────────────────────────────────────────────────────────────
class ClassController {
  private svc = new ClassService();
  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try { const { data, meta } = await this.svc.getAll(req.query as Record<string, unknown>); ResponseHandler.paginated(res, data, meta); } catch (e) { next(e); }
  };
  getToday = async (_req: Request, res: Response, next: NextFunction) => {
    try { const data = await this.svc.getToday(); ResponseHandler.success(res, data, 'Today\'s classes fetched'); } catch (e) { next(e); }
  };
  getUpcoming = async (req: Request, res: Response, next: NextFunction) => {
    try { const limit = req.query.limit ? Number(req.query.limit) : 10; const data = await this.svc.getUpcoming(limit); ResponseHandler.success(res, data, 'Upcoming classes fetched'); } catch (e) { next(e); }
  };
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try { const data = await this.svc.getById(req.params.id as string); ResponseHandler.success(res, data); } catch (e) { next(e); }
  };
  create = async (req: Request, res: Response, next: NextFunction) => {
    try { const data = await this.svc.create(req.body as Record<string, unknown>); ResponseHandler.created(res, data, 'Class scheduled successfully'); } catch (e) { next(e); }
  };
  update = async (req: Request, res: Response, next: NextFunction) => {
    try { const data = await this.svc.update(req.params.id as string, req.body as Record<string, unknown>); ResponseHandler.success(res, data, 'Class updated'); } catch (e) { next(e); }
  };
  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try { const data = await this.svc.updateStatus(req.params.id as string, req.body as Record<string, unknown>); ResponseHandler.success(res, data, 'Class status updated'); } catch (e) { next(e); }
  };
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try { await this.svc.delete(req.params.id as string); ResponseHandler.noContent(res); } catch (e) { next(e); }
  };
  joinClass = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cls = await this.svc.getById(req.params.id as string);
      await this.svc.addAttendee(req.params.id as string, req.user!.userId);
      ResponseHandler.success(res, { zoomJoinUrl: cls.zoomJoinUrl, zoomPassword: cls.zoomPassword }, 'Join link fetched');
    } catch (e) { next(e); }
  };
}

// ─── Router ───────────────────────────────────────────────────────────────────
const router = Router();
const ctrl = new ClassController();
const idValidate = validate({ params: z.object({ id: objectIdSchema }) });

router.get('/', validate({ query: paginationSchema }), ctrl.getAll);
router.get('/today', ctrl.getToday);
router.get('/upcoming', ctrl.getUpcoming);
router.get('/:id', idValidate, ctrl.getById);
router.post('/:id/join', authenticate, idValidate, ctrl.joinClass);
router.post('/', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), validate({ body: createClassSchema }), ctrl.create);
router.patch('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), idValidate, validate({ body: updateClassSchema }), ctrl.update);
router.patch('/:id/status', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), idValidate, validate({ body: updateClassStatusSchema }), ctrl.updateStatus);
router.delete('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), idValidate, ctrl.delete);

export default router;

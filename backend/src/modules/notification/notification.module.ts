// ============================================================
// VIREON — NOTIFICATION MODULE (FCM Push + In-App)
// ============================================================
import { Router, Request, Response, NextFunction } from 'express';
import { Model } from 'mongoose';
import { z } from 'zod';
import { NotificationModel, INotificationDocument } from '../../models/notification.model';
import { UserModel } from '../../models/user.model';
import { BaseRepository } from '../../core/base.repository';
import { ResponseHandler } from '../../core/response';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { sendNotificationSchema, paginationSchema, objectIdSchema, registerFcmTokenSchema } from '@vireon/shared/schemas';
import { UserRole } from '@vireon/shared';
import { getFirebaseMessaging } from '../../config/firebase';
import { logger } from '../../config/logger';

class NotificationRepository extends BaseRepository<INotificationDocument> {
  constructor() { super(NotificationModel as Model<INotificationDocument>); }
  async findForUser(userId: string, query: Record<string, unknown>) {
    return this.findAll(
      { $or: [{ recipientId: userId }, { recipientId: null }] },
      query as Parameters<NotificationRepository['findAll']>[1]
    );
  }
  async markAllRead(userId: string): Promise<void> {
    await NotificationModel.updateMany(
      { $or: [{ recipientId: userId }, { recipientId: null }], isRead: false },
      { isRead: true, readAt: new Date() }
    );
  }
  async getUnreadCount(userId: string): Promise<number> {
    return NotificationModel.countDocuments({ $or: [{ recipientId: userId }, { recipientId: null }], isRead: false });
  }
}

class NotificationService {
  private repo = new NotificationRepository();

  async sendPushNotification(tokens: string[], title: string, body: string, data?: Record<string, string>): Promise<void> {
    if (tokens.length === 0) return;
    try {
      const messaging = getFirebaseMessaging();
      const chunks: string[][] = [];
      for (let i = 0; i < tokens.length; i += 500) chunks.push(tokens.slice(i, i + 500));
      await Promise.allSettled(
        chunks.map((chunk) =>
          messaging.sendEachForMulticast({ tokens: chunk, notification: { title, body }, data, android: { priority: 'high' }, apns: { headers: { 'apns-priority': '10' } } })
        )
      );
    } catch (err) {
      logger.error('FCM push notification error:', err);
    }
  }

  async create(data: Record<string, unknown>, senderId: string) {
    const notification = await this.repo.create(data as Partial<INotificationDocument>);
    // Send FCM push
    let tokens: string[] = [];
    if (data.recipientId) {
      const user = await UserModel.findById(data.recipientId as string).select('fcmTokens');
      if (user) tokens = user.fcmTokens;
    } else {
      // Broadcast — get all user tokens
      const users = await UserModel.find({ status: 'ACTIVE' }).select('fcmTokens').lean();
      tokens = users.flatMap((u) => u.fcmTokens ?? []);
    }
    if (tokens.length > 0 && !data.scheduledAt) {
      await this.sendPushNotification(tokens, data.title as string, data.body as string, data.dataPayload as Record<string, string> | undefined);
      await this.repo.updateById((notification._id as unknown as string), { isSent: true, sentAt: new Date() });
    }
    return notification;
  }

  async getForUser(userId: string, query: Record<string, unknown>) { return this.repo.findForUser(userId, query); }
  async markAllRead(userId: string) { await this.repo.markAllRead(userId); }
  async getUnreadCount(userId: string) { return this.repo.getUnreadCount(userId); }
  async markRead(id: string) { return this.repo.updateById(id, { isRead: true, readAt: new Date() }); }
  async getAll(query: Record<string, unknown>) { return this.repo.findAll({}, query as Parameters<NotificationRepository['findAll']>[1]); }
  async delete(id: string) { await this.repo.deleteById(id); }
}

class NotificationController {
  private svc = new NotificationService();
  getForUser = async (req: Request, res: Response, next: NextFunction) => {
    try { const { data, meta } = await this.svc.getForUser(req.user!.userId, req.query as Record<string, unknown>); ResponseHandler.paginated(res, data, meta); } catch (e) { next(e); }
  };
  getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
    try { const count = await this.svc.getUnreadCount(req.user!.userId); ResponseHandler.success(res, { count }); } catch (e) { next(e); }
  };
  markRead = async (req: Request, res: Response, next: NextFunction) => {
    try { await this.svc.markRead(req.params.id as string); ResponseHandler.success(res, null, 'Marked as read'); } catch (e) { next(e); }
  };
  markAllRead = async (req: Request, res: Response, next: NextFunction) => {
    try { await this.svc.markAllRead(req.user!.userId); ResponseHandler.success(res, null, 'All notifications marked as read'); } catch (e) { next(e); }
  };
  send = async (req: Request, res: Response, next: NextFunction) => {
    try { const data = await this.svc.create(req.body as Record<string, unknown>, req.user!.userId); ResponseHandler.created(res, data, 'Notification sent'); } catch (e) { next(e); }
  };
  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try { const { data, meta } = await this.svc.getAll(req.query as Record<string, unknown>); ResponseHandler.paginated(res, data, meta); } catch (e) { next(e); }
  };
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try { await this.svc.delete(req.params.id as string); ResponseHandler.noContent(res); } catch (e) { next(e); }
  };
}

const router = Router();
const ctrl = new NotificationController();
const idV = validate({ params: z.object({ id: objectIdSchema }) });

router.get('/my', authenticate, validate({ query: paginationSchema }), ctrl.getForUser);
router.get('/my/unread-count', authenticate, ctrl.getUnreadCount);
router.patch('/my/read-all', authenticate, ctrl.markAllRead);
router.patch('/:id/read', authenticate, idV, ctrl.markRead);
router.get('/', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), validate({ query: paginationSchema }), ctrl.getAll);
router.post('/send', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), validate({ body: sendNotificationSchema }), ctrl.send);
router.delete('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), idV, ctrl.delete);

// ─── FCM Token Management ─────────────────────────────────────────────────────
router.post('/fcm-token', authenticate, validate({ body: registerFcmTokenSchema }), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fcmToken } = req.body as { fcmToken: string };
    await UserModel.findByIdAndUpdate(req.user!.userId, { $addToSet: { fcmTokens: fcmToken } });
    ResponseHandler.success(res, null, 'FCM token registered');
  } catch (e) { next(e); }
});

router.delete('/fcm-token', authenticate, validate({ body: registerFcmTokenSchema }), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fcmToken } = req.body as { fcmToken: string };
    await UserModel.findByIdAndUpdate(req.user!.userId, { $pull: { fcmTokens: fcmToken } });
    ResponseHandler.success(res, null, 'FCM token removed');
  } catch (e) { next(e); }
});

export default router;

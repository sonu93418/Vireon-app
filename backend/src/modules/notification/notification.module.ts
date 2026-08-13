import axios from 'axios';
import { Router, Request, Response, NextFunction } from 'express';
import { Model } from 'mongoose';
import { z } from 'zod';
import { NotificationModel, INotificationDocument } from '../../models/notification.model';
import { UserModel } from '../../models/user.model';
import { BaseRepository } from '../../core/base.repository';
import { ResponseHandler } from '../../core/response';
import { BadRequestError } from '../../core/errors';
import { authenticate, authorize, optionalAuthenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { sendNotificationSchema, paginationSchema, objectIdSchema, registerFcmTokenSchema } from '../../shared/schemas';
import { UserRole } from '../../shared';
import { getFirebaseMessaging } from '../../config/firebase';
import { logger } from '../../config/logger';

import { LOCK_SCREEN_TEMPLATES } from './notification.templates';

class NotificationRepository extends BaseRepository<INotificationDocument> {
  constructor() { super(NotificationModel as Model<INotificationDocument>); }
  async findForUser(userId: string, query: Record<string, unknown>) {
    return this.findAll(
      {
        $or: [{ recipientId: userId }, { recipientId: null }],
        deletedByUsers: { $ne: userId },
      },
      query as Parameters<NotificationRepository['findAll']>[1]
    );
  }
  async markAllRead(userId: string): Promise<void> {
    await NotificationModel.updateMany(
      {
        $or: [{ recipientId: userId }, { recipientId: null }],
        isRead: false,
        deletedByUsers: { $ne: userId },
      },
      { isRead: true, readAt: new Date() }
    );
  }
  async getUnreadCount(userId: string): Promise<number> {
    return NotificationModel.countDocuments({
      $or: [{ recipientId: userId }, { recipientId: null }],
      isRead: false,
      deletedByUsers: { $ne: userId },
    });
  }
  async clearAllForUser(userId: string, isAdmin = false): Promise<void> {
    if (isAdmin) {
      await NotificationModel.deleteMany({});
    } else {
      await NotificationModel.deleteMany({ recipientId: userId });
      await NotificationModel.updateMany(
        { recipientId: null, deletedByUsers: { $ne: userId } },
        { $addToSet: { deletedByUsers: userId } }
      );
    }
  }
  async deleteForUser(id: string, userId: string): Promise<void> {
    const notif = await NotificationModel.findById(id);
    if (!notif) return;
    if (notif.recipientId && String(notif.recipientId) === userId) {
      await NotificationModel.findByIdAndDelete(id);
    } else {
      await NotificationModel.findByIdAndUpdate(id, { $addToSet: { deletedByUsers: userId } });
    }
  }
}

class NotificationService {
  private repo = new NotificationRepository();

  private getChannelForType(type?: string): string {
    switch (type) {
      case 'CLASS_STARTED':
      case 'ANNOUNCEMENT':
        return 'vireon_alerts_v4';
      case 'CLASS_REMINDER':
        return 'vireon_reminders_v4';
      case 'PLACEMENT':
        return 'vireon_placements_v4';
      case 'COURSE_UPDATE':
      case 'NEW_BLOG':
        return 'vireon_courses_v4';
      default:
        return 'vireon_default_v4';
    }
  }

  async sendPushNotification(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
    type?: string
  ): Promise<void> {
    if (tokens.length === 0) return;
    const channelId = this.getChannelForType(type ?? data?.type);

    const fcmTokens = tokens.filter((t) => !t.startsWith('ExponentPushToken') && !t.startsWith('ExpoPushToken'));
    const expoTokens = tokens.filter((t) => t.startsWith('ExponentPushToken') || t.startsWith('ExpoPushToken'));

    if (expoTokens.length > 0) {
      try {
        await axios.post('https://exp.host/--/api/v2/push/send', expoTokens.map((to) => ({
          to,
          sound: 'default',
          title,
          body,
          data,
          priority: 'high',
          channelId,
          _displayInForeground: true,
        })));
        logger.info(`✅ Sent ${expoTokens.length} Expo push notifications`);
      } catch (err) {
        logger.error('Expo push notification error:', err);
      }
    }

    if (fcmTokens.length > 0) {
      try {
        const messaging = getFirebaseMessaging();
        const chunks: string[][] = [];
        for (let i = 0; i < fcmTokens.length; i += 500) chunks.push(fcmTokens.slice(i, i + 500));
        await Promise.allSettled(
          chunks.map(async (chunk) => {
            const res = await messaging.sendEachForMulticast({
              tokens: chunk,
              notification: { title, body },
              data,
              android: {
                priority: 'high',
                ttl: 86400000,
                notification: {
                  channelId: channelId || 'vireon_alerts_v4',
                  sound: 'default',
                  visibility: 'public',
                  priority: 'max',
                  defaultSound: true,
                  defaultVibrateTimings: true,
                  notificationCount: 1,
                },
              },
              apns: {
                headers: {
                  'apns-priority': '10',
                  'apns-push-type': 'alert',
                },
                payload: {
                  aps: {
                    alert: { title, body },
                    sound: 'default',
                    badge: 1,
                    contentAvailable: true,
                  },
                },
              },
            });

            logger.info(`📱 [FCM DISPATCH] Sent to ${chunk.length} FCM tokens. Success: ${res.successCount}, Failure: ${res.failureCount}`);
            if (res.responses) {
              for (let idx = 0; idx < res.responses.length; idx++) {
                const r = res.responses[idx];
                if (!r.success) {
                  logger.warn(`⚠️ [FCM DISPATCH ERROR] Token index ${idx} failed: ${r.error?.code} - ${r.error?.message}`);
                  if (r.error?.code === 'messaging/registration-token-not-registered') {
                    const stale = chunk[idx];
                    await UserModel.updateMany({}, { $pull: { fcmTokens: stale } });
                    logger.info(`🧹 Cleaned up stale FCM token: ${stale.slice(0, 20)}...`);
                  }
                }
              }
            }
          })
        );
      } catch (err) {
        logger.error('FCM push notification error:', err);
      }
    }
  }

  async create(data: Record<string, unknown>, senderId: string) {
    const notification = await this.repo.create(data as Partial<INotificationDocument>);
    // Send FCM / Expo push
    let tokens: string[] = [];
    if (data.recipientId) {
      const user = await UserModel.findById(data.recipientId as string).select('fcmTokens');
      if (user) tokens = user.fcmTokens ?? [];
    } else if (data.targetRoles && Array.isArray(data.targetRoles) && data.targetRoles.length > 0) {
      const users = await UserModel.find({
        role: { $in: data.targetRoles },
        status: { $ne: 'SUSPENDED' },
        fcmTokens: { $exists: true, $not: { $size: 0 } },
      }).select('fcmTokens').lean();
      tokens = users.flatMap((u) => u.fcmTokens ?? []);
    } else {
      // Broadcast — get all active user tokens
      const users = await UserModel.find({
        fcmTokens: { $exists: true, $not: { $size: 0 } },
      }).select('fcmTokens').lean();
      tokens = users.flatMap((u) => u.fcmTokens ?? []);

      // Fail-safe: If query returned 0 tokens, fetch all distinct fcmTokens from database
      if (tokens.length === 0) {
        const distinctTokens = await UserModel.distinct('fcmTokens');
        tokens = distinctTokens.filter((t): t is string => typeof t === 'string' && Boolean(t));
      }
    }

    // Clean & deduplicate tokens
    tokens = Array.from(new Set(tokens.filter(Boolean)));

    logger.info(`📊 [PUSH DEBUG] Found ${tokens.length} FCM/Expo tokens for notification dispatch`);
    if (tokens.length > 0) {
      logger.info(`📊 [PUSH DEBUG] Token samples: ${tokens.slice(0, 3).map(t => t.slice(0, 30) + '...').join(', ')}`);
    } else {
      logger.warn('⚠️ [PUSH DEBUG] NO tokens found in database. Users have no registered push tokens. Push delivery SKIPPED.');
    }

    if (tokens.length > 0 && !data.scheduledAt) {
      const payloadData: Record<string, string> = {
        type: String(data.type || 'ANNOUNCEMENT'),
        notificationId: String(notification._id),
        screen: String(
          data.type === 'CLASS_STARTED' || data.type === 'CLASS_REMINDER'
            ? '/classes'
            : data.type === 'PLACEMENT'
            ? '/courses'
            : data.type === 'COURSE_UPDATE'
            ? '/resources'
            : '/notifications'
        ),
        ...((data.dataPayload as Record<string, string>) || {}),
      };

      await this.sendPushNotification(
        tokens,
        data.title as string,
        data.body as string,
        payloadData,
        data.type as string
      );
      await this.repo.updateById((notification._id as unknown as string), { isSent: true, sentAt: new Date() });
    }
    return notification;
  }

  async getForUser(userId: string, query: Record<string, unknown>) { return this.repo.findForUser(userId, query); }
  async markAllRead(userId: string) { await this.repo.markAllRead(userId); }
  async clearAllForUser(userId: string, isAdmin = false) { await this.repo.clearAllForUser(userId, isAdmin); }
  async getUnreadCount(userId: string) { return this.repo.getUnreadCount(userId); }
  async markRead(id: string) { return this.repo.updateById(id, { isRead: true, readAt: new Date() }); }
  async getAll(query: Record<string, unknown>) { return this.repo.findAll({}, query as Parameters<NotificationRepository['findAll']>[1]); }
  async delete(id: string) { await this.repo.deleteById(id); }
  async deleteForUser(id: string, userId: string) { await this.repo.deleteForUser(id, userId); }
}

class NotificationController {
  private svc = new NotificationService();
  getForUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (userId) {
        const { data, meta } = await this.svc.getForUser(userId, req.query as Record<string, unknown>);
        return ResponseHandler.paginated(res, data, meta);
      }
      const { data, meta } = await this.svc.getAll(req.query as Record<string, unknown>);
      return ResponseHandler.paginated(res, data, meta);
    } catch (e) {
      next(e);
    }
  };
  getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return ResponseHandler.success(res, { count: 0 });
      const count = await this.svc.getUnreadCount(userId);
      ResponseHandler.success(res, { count });
    } catch (e) {
      next(e);
    }
  };
  markRead = async (req: Request, res: Response, next: NextFunction) => {
    try { await this.svc.markRead(req.params.id as string); ResponseHandler.success(res, null, 'Marked as read'); } catch (e) { next(e); }
  };
  markAllRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user?.userId) {
        await this.svc.markAllRead(req.user.userId);
      }
      ResponseHandler.success(res, null, 'All notifications marked as read');
    } catch (e) {
      next(e);
    }
  };
  clearAllForUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;
      if (user?.userId) {
        await this.svc.clearAllForUser(user.userId, isAdmin);
      } else if (isAdmin) {
        await NotificationModel.deleteMany({});
      }
      ResponseHandler.success(res, null, 'Notifications cleared');
    } catch (e) {
      next(e);
    }
  };
  send = async (req: Request, res: Response, next: NextFunction) => {
    try { const data = await this.svc.create(req.body as Record<string, unknown>, req.user!.userId); ResponseHandler.created(res, data, 'Notification sent'); } catch (e) { next(e); }
  };
  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try { const { data, meta } = await this.svc.getAll(req.query as Record<string, unknown>); ResponseHandler.paginated(res, data, meta); } catch (e) { next(e); }
  };
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN) {
        await this.svc.delete(req.params.id as string);
      } else if (user?.userId) {
        await this.svc.deleteForUser(req.params.id as string, user.userId);
      } else {
        await this.svc.delete(req.params.id as string);
      }
      ResponseHandler.noContent(res);
    } catch (e) {
      next(e);
    }
  };
}

const router = Router();
const ctrl = new NotificationController();
const idV = validate({ params: z.object({ id: objectIdSchema }) });

router.get('/templates', optionalAuthenticate, (_req: Request, res: Response) => {
  ResponseHandler.success(res, LOCK_SCREEN_TEMPLATES, 'Lock screen notification templates');
});

router.get('/public', optionalAuthenticate, validate({ query: paginationSchema }), ctrl.getForUser);
router.get('/my', optionalAuthenticate, validate({ query: paginationSchema }), ctrl.getForUser);
router.get('/my/unread-count', optionalAuthenticate, ctrl.getUnreadCount);
router.patch('/my/read-all', optionalAuthenticate, ctrl.markAllRead);
router.delete('/my/clear-all', optionalAuthenticate, ctrl.clearAllForUser);
router.patch('/:id/read', authenticate, idV, ctrl.markRead);
router.get('/', optionalAuthenticate, validate({ query: paginationSchema }), ctrl.getForUser);
router.post('/send', authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), validate({ body: sendNotificationSchema }), ctrl.send);
router.delete('/:id', optionalAuthenticate, idV, ctrl.delete);

// ─── FCM Token Management ─────────────────────────────────────────────────────
router.post('/fcm-token', optionalAuthenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fcmToken, email } = req.body as { fcmToken: string; email?: string };
    if (!fcmToken) throw new BadRequestError('fcmToken is required');

    // Reject synthetic fallback or non-FCM tokens
    if (fcmToken.includes('DEV_LOCAL') || fcmToken.includes('ExponentPushToken')) {
      logger.warn(`⚠️ [FCM] Rejected synthetic token registration attempt: ${fcmToken}`);
      throw new BadRequestError('Only valid native FCM device tokens can be registered');
    }

    // Prune any legacy synthetic fallback tokens from all user records
    await UserModel.updateMany(
      {},
      { $pull: { fcmTokens: { $regex: 'DEV_LOCAL|ExponentPushToken' } } }
    );

    let userId = req.user?.userId;
    if (!userId && email) {
      const user = await UserModel.findOne({ email: email.toLowerCase() });
      if (user) userId = String(user._id);
    }

    if (userId) {
      await UserModel.findByIdAndUpdate(userId, { $addToSet: { fcmTokens: fcmToken } });
      logger.info(`[FCM][TOKEN_REGISTER] ✅ Native FCM token registered for user ${userId} (${email || ''})`);
    } else {
      await UserModel.updateMany({ status: { $ne: 'SUSPENDED' } }, { $addToSet: { fcmTokens: fcmToken } });
      logger.info(`[FCM][TOKEN_REGISTER] ✅ Native FCM token registered to active user records`);
    }

    ResponseHandler.success(res, { success: true }, 'Native FCM token registered successfully');
  } catch (e) { next(e); }
});

router.delete('/fcm-token', optionalAuthenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fcmToken } = req.body as { fcmToken: string };
    if (fcmToken) {
      await UserModel.updateMany({}, { $pull: { fcmTokens: fcmToken } });
    }
    ResponseHandler.success(res, null, 'FCM token removed');
  } catch (e) { next(e); }
});

export default router;

// ============================================================
// VIREON — AGENDA.JS BACKGROUND JOBS
// Scheduled class reminders and analytics generation
// ============================================================
import Agenda from 'agenda';
import { ClassModel } from '../models/class.model';
import { UserModel } from '../models/user.model';
import { NotificationModel } from '../models/notification.model';
import { getFirebaseMessaging } from '../config/firebase';
import { sendClassReminderEmail } from './mailer.util';
import { logger } from '../config/logger';
import { ClassStatus, NotificationType } from '@vireon/shared';

export const JOB_NAMES = {
  SEND_CLASS_REMINDERS: 'send-class-reminders',
  MARK_LIVE_CLASSES: 'mark-live-classes',
  MARK_COMPLETED_CLASSES: 'mark-completed-classes',
  SCHEDULED_NOTIFICATION: 'scheduled-notification',
} as const;

export const registerAgendaJobs = async (agenda: Agenda): Promise<void> => {
  // ─── Job: Send Class Reminders (30 min before class) ──────────────────────
  agenda.define(JOB_NAMES.SEND_CLASS_REMINDERS, async () => {
    try {
      const now = new Date();
      const in30Min = new Date(now.getTime() + 30 * 60 * 1000);
      const in31Min = new Date(now.getTime() + 31 * 60 * 1000);

      const classes = await ClassModel.find({
        scheduledAt: { $gte: in30Min, $lt: in31Min },
        status: ClassStatus.SCHEDULED,
        reminderSent: false,
      })
        .populate('attendees', 'fcmTokens email fullName')
        .lean();

      for (const cls of classes) {
        const attendees = cls.attendees as unknown as Array<{ fcmTokens: string[]; email: string; fullName: string; _id: string }>;
        let fcmTokens = attendees.flatMap((a) => a.fcmTokens ?? []);
        const classIdStr = String(cls._id);

        // Fallback: If no explicit attendees with tokens, broadcast to all active users
        if (fcmTokens.length === 0) {
          const activeUsers = await UserModel.find({ status: { $ne: 'SUSPENDED' }, fcmTokens: { $exists: true, $not: { $size: 0 } } }).select('fcmTokens').lean();
          fcmTokens = activeUsers.flatMap((u) => u.fcmTokens ?? []).filter(Boolean);
        }

        // FCM Push
        if (fcmTokens.length > 0) {
          try {
            const messaging = getFirebaseMessaging();
            await messaging.sendEachForMulticast({
              tokens: fcmTokens,
              notification: {
                title: `⏰ Class Starting in 30 Minutes`,
                body: `${cls.title} starts at ${new Date(cls.scheduledAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
              },
              data: {
                type: NotificationType.CLASS_REMINDER,
                classId: classIdStr,
                zoomJoinUrl: cls.zoomJoinUrl ?? '',
              },
              android: {
                priority: 'high',
                notification: {
                  channelId: 'vireon_reminders_v3',
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
          } catch (err) {
            logger.error('FCM class reminder failed:', err);
          }
        }

        // Email reminders
        await Promise.allSettled(
          attendees.map((a) =>
            sendClassReminderEmail(a.email, cls.title, new Date(cls.scheduledAt), cls.zoomJoinUrl ?? '')
          )
        );

        // Store in-app notification
        await NotificationModel.create({
          title: '⏰ Class Reminder',
          body: `${cls.title} starts in 30 minutes`,
          type: NotificationType.CLASS_REMINDER,
          dataPayload: { classId: classIdStr, zoomJoinUrl: cls.zoomJoinUrl ?? '' },
          isSent: true,
          sentAt: new Date(),
        });

        // Mark as sent
        await ClassModel.findByIdAndUpdate(classIdStr, { reminderSent: true });
        logger.info(`✅ Reminder sent for class: ${cls.title}`);
      }
    } catch (err) {
      logger.error('❌ Class reminder job failed:', err);
    }
  });

  // ─── Job: Mark Classes as LIVE ─────────────────────────────────────────────
  agenda.define(JOB_NAMES.MARK_LIVE_CLASSES, async () => {
    const now = new Date();
    const startingClasses = await ClassModel.find({
      scheduledAt: { $lte: now },
      status: ClassStatus.SCHEDULED,
    }).lean();

    for (const cls of startingClasses) {
      await ClassModel.findByIdAndUpdate(String(cls._id), { status: ClassStatus.LIVE });

      const notifTitle = `🚨 LIVE NOW: ${cls.title}`;
      const notifBody = `The live session for ${cls.subject} is live right now! Tap to join session.`;

      await NotificationModel.create({
        title: notifTitle,
        body: notifBody,
        type: NotificationType.CLASS_STARTED,
        dataPayload: { classId: String(cls._id), zoomJoinUrl: cls.zoomJoinUrl ?? '' },
        isSent: true,
        sentAt: new Date(),
      });

      const users = await UserModel.find({ status: { $ne: 'SUSPENDED' }, fcmTokens: { $exists: true, $not: { $size: 0 } } }).select('fcmTokens').lean();
      const tokens = users.flatMap((u) => u.fcmTokens ?? []).filter(Boolean);

      if (tokens.length > 0) {
        try {
          const messaging = getFirebaseMessaging();
          await messaging.sendEachForMulticast({
            tokens,
            notification: { title: notifTitle, body: notifBody },
            data: {
              type: NotificationType.CLASS_STARTED,
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
        } catch (err) {
          logger.error('FCM live class push failed:', err);
        }
      }
    }
  });

  // ─── Job: Mark Classes as COMPLETED ──────────────────────────────────────
  agenda.define(JOB_NAMES.MARK_COMPLETED_CLASSES, async () => {
    const now = new Date();
    const liveClasses = await ClassModel.find({ status: ClassStatus.LIVE }).lean();
    for (const cls of liveClasses) {
      const endTime = new Date(cls.scheduledAt.getTime() + cls.durationMinutes * 60 * 1000);
      if (now >= endTime) {
        await ClassModel.findByIdAndUpdate(String(cls._id), { status: ClassStatus.COMPLETED });
      }
    }
  });

  // ─── Job: Send Scheduled Notification ────────────────────────────────────
  agenda.define(JOB_NAMES.SCHEDULED_NOTIFICATION, async (job: { attrs: { data: unknown } }) => {
    const { notificationId } = job.attrs.data as { notificationId: string };
    const notification = await NotificationModel.findById(notificationId);
    if (!notification || notification.isSent) return;

    let tokens: string[] = [];
    if (notification.recipientId) {
      const user = await UserModel.findById(notification.recipientId).select('fcmTokens');
      if (user) tokens = user.fcmTokens;
    } else {
      const users = await UserModel.find({ status: { $ne: 'SUSPENDED' }, fcmTokens: { $exists: true, $not: { $size: 0 } } }).select('fcmTokens').lean();
      tokens = users.flatMap((u) => u.fcmTokens ?? []);
    }

    if (tokens.length > 0) {
      try {
        const messaging = getFirebaseMessaging();
        await messaging.sendEachForMulticast({
          tokens,
          notification: { title: notification.title, body: notification.body },
          data: notification.dataPayload ?? {},
        });
      } catch (err) {
        logger.error('Scheduled FCM push failed:', err);
      }
    }

    await NotificationModel.findByIdAndUpdate(notificationId, { isSent: true, sentAt: new Date() });
    logger.info(`✅ Scheduled notification ${notificationId} sent`);
  });

  // ─── Schedule recurring jobs ──────────────────────────────────────────────
  await agenda.every('1 minute', JOB_NAMES.SEND_CLASS_REMINDERS);
  await agenda.every('1 minute', JOB_NAMES.MARK_LIVE_CLASSES);
  await agenda.every('5 minutes', JOB_NAMES.MARK_COMPLETED_CLASSES);

  logger.info('✅ Agenda background jobs registered and scheduled');
};

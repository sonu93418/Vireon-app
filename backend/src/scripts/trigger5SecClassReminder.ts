import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import { UserModel } from '../models/user.model';
import { configureFirebase, getFirebaseMessaging } from '../config/firebase';
import { NotificationType } from '@vireon/shared';
import { NotificationModel } from '../models/notification.model';

const MONGO_URI = process.env.MONGODB_URI;

async function run() {
  console.log('------------------------------------------------------------');
  console.log('⏰ VIREON 5-SECOND CLASS REMINDER PUSH TRIGGER');
  console.log('------------------------------------------------------------\n');

  try {
    if (!MONGO_URI) {
      console.error('❌ MONGODB_URI not found in environment!');
      process.exit(1);
    }

    // Initialize Firebase Admin SDK
    configureFirebase();
    console.log('✅ Firebase Admin SDK initialized');

    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to Live MongoDB Atlas');

    // Fetch all non-suspended users with FCM tokens
    const updatedUsers = await UserModel.find({
      status: { $ne: 'SUSPENDED' },
      fcmTokens: { $exists: true, $not: { $size: 0 } },
    }).select('fcmTokens email fullName').lean();

    const tokens = Array.from(new Set(updatedUsers.flatMap((u) => u.fcmTokens ?? []))).filter(Boolean);

    console.log(`\n📱 Target: ${updatedUsers.length} user(s) with ${tokens.length} FCM device token(s).`);

    if (tokens.length === 0) {
      console.warn('⚠️ No active FCM device tokens registered in database!');
      console.warn('👉 Please launch the Vireon app on your phone so it auto-registers a fresh FCM token.');
      process.exit(0);
    }

    const notifTitle = '⏰ Class Starting in 30 Minutes';
    const notifBody = 'Diploma in Fire & Industrial Safety starts at 6:30 PM. Tap to join live session!';

    // Save in-app notification record
    await NotificationModel.create({
      title: notifTitle,
      body: notifBody,
      type: NotificationType.CLASS_REMINDER,
      dataPayload: { classId: 'demo_class_5s', zoomJoinUrl: 'https://zoom.us/j/demo123' },
      isSent: true,
      sentAt: new Date(),
    });

    // Send high-priority FCM lock screen multicast push
    const messaging = getFirebaseMessaging();
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: notifTitle,
        body: notifBody,
      },
      data: {
        type: NotificationType.CLASS_REMINDER,
        classId: 'demo_class_5s',
        zoomJoinUrl: 'https://zoom.us/j/demo123',
      },
      android: {
        priority: 'high',
        ttl: 86400000,
        notification: {
          channelId: 'vireon_reminders_v3',
          visibility: 'public',
          priority: 'max',
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
      apns: {
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'alert',
        },
        payload: {
          aps: {
            alert: { title: notifTitle, body: notifBody },
            sound: 'default',
            badge: 1,
            contentAvailable: true,
          },
        },
      },
    });

    console.log(`\n🚀 LOCK SCREEN PUSH SENT TO FCM!`);
    console.log(`   Success Count : ${response.successCount}`);
    console.log(`   Failure Count : ${response.failureCount}`);

    if (response.responses) {
      for (let idx = 0; idx < response.responses.length; idx++) {
        const res = response.responses[idx];
        if (res.success) {
          console.log(`   ✅ Token #${idx + 1}: Delivered to device successfully!`);
        } else {
          console.error(`   ❌ Token #${idx + 1} Error:`, res.error?.code || res.error?.message);
          if (res.error?.code === 'messaging/registration-token-not-registered') {
            const staleToken = tokens[idx];
            await UserModel.updateMany({}, { $pull: { fcmTokens: staleToken } });
            console.log(`   🧹 Cleaned up stale token from database.`);
          }
        }
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Script error:', error);
    process.exit(1);
  }
}

void run();

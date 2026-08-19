// ============================================================
// VIREON MOBILE — PUSH NOTIFICATION SERVICE
// Firebase Cloud Messaging via expo-notifications
// ============================================================
import axios from 'axios';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import apiClient, { getAccessToken, getUserProfileStorage } from './api';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// ─── Configure notification behavior safely for native platforms ─────────────
if (Platform.OS !== 'web') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      }),
    });
  } catch {
    // Ignore notification handler setup errors in unsupported environments
  }
}

/**
 * Request notification permissions, configure high-priority Android channels,
 * and fetch the real native FCM device push token via getDevicePushTokenAsync().
 * Returns null if permissions are denied, device is unsupported, or FCM token generation fails.
 */
export const registerForPushNotifications = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    console.log('[FCM][PERMISSION] Web platform detected; skipping native FCM registration.');
    return null;
  }

  try {
    // 1. Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not already granted
    if (existingStatus !== 'granted') {
      console.log('[FCM][PERMISSION] Requesting notification permissions...');
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    console.log(`[FCM][PERMISSION] Final notification permission status: ${finalStatus}`);
    if (finalStatus !== 'granted') {
      console.warn('[FCM][PERMISSION] Push notification permission denied by user.');
      return null;
    }

    // 2. Android notification channels configuration
    if (Platform.OS === 'android') {
      const channelAudioAttributes = {
        usage: Notifications.AndroidAudioUsage.NOTIFICATION,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      };

      const channelsToConfigure: Array<{ id: string; name: string; lightColor: string; vibrationPattern: number[] }> = [
        { id: 'vireon_default_v4', name: 'Vireon Notifications', lightColor: '#16A34A', vibrationPattern: [0, 250, 250, 250] },
        { id: 'vireon_default_v3', name: 'Vireon Notifications', lightColor: '#16A34A', vibrationPattern: [0, 250, 250, 250] },
        { id: 'default', name: 'Vireon General Notifications', lightColor: '#16A34A', vibrationPattern: [0, 250, 250, 250] },
        { id: 'vireon_alerts_v4', name: 'Vireon Live Class & Exam Alerts', lightColor: '#DC2626', vibrationPattern: [0, 500, 250, 500] },
        { id: 'vireon_alerts_v3', name: 'Vireon Live Class & Exam Alerts', lightColor: '#DC2626', vibrationPattern: [0, 500, 250, 500] },
        { id: 'vireon_alerts', name: 'Vireon Live Alerts', lightColor: '#DC2626', vibrationPattern: [0, 500, 250, 500] },
        { id: 'vireon_reminders_v4', name: 'Vireon Class Reminders', lightColor: '#2563EB', vibrationPattern: [0, 250, 250, 250] },
        { id: 'vireon_reminders_v3', name: 'Vireon Class Reminders', lightColor: '#2563EB', vibrationPattern: [0, 250, 250, 250] },
        { id: 'vireon_reminders', name: 'Vireon Reminders', lightColor: '#2563EB', vibrationPattern: [0, 250, 250, 250] },
        { id: 'vireon_placements_v4', name: 'Vireon Placement & Hiring Drives', lightColor: '#D97706', vibrationPattern: [0, 400, 200, 400] },
        { id: 'vireon_placements_v3', name: 'Vireon Placement & Hiring Drives', lightColor: '#D97706', vibrationPattern: [0, 400, 200, 400] },
        { id: 'vireon_placements', name: 'Vireon Placements', lightColor: '#D97706', vibrationPattern: [0, 400, 200, 400] },
        { id: 'vireon_courses_v4', name: 'Vireon Course & Learning Updates', lightColor: '#16A34A', vibrationPattern: [0, 250] },
        { id: 'vireon_courses_v3', name: 'Vireon Course & Learning Updates', lightColor: '#16A34A', vibrationPattern: [0, 250] },
        { id: 'vireon_courses', name: 'Vireon Course Updates', lightColor: '#16A34A', vibrationPattern: [0, 250] },
      ];

      for (const ch of channelsToConfigure) {
        await Notifications.setNotificationChannelAsync(ch.id, {
          name: ch.name,
          importance: Notifications.AndroidImportance.MAX,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          vibrationPattern: ch.vibrationPattern,
          lightColor: ch.lightColor,
          enableLights: true,
          enableVibrate: true,
          showBadge: true,
          bypassDnd: true,
          audioAttributes: channelAudioAttributes,
        });
      }
      console.log('[FCM][CHANNEL] Android MAX-importance & PUBLIC lockscreen channels configured successfully.');
    }

    // 3. Direct Native FCM Token Fetch via getDevicePushTokenAsync() ONLY
    try {
      console.log('[FCM][TOKEN] Requesting native FCM device push token via getDevicePushTokenAsync()...');
      const tokenData = await Notifications.getDevicePushTokenAsync();
      const fcmToken = tokenData?.data ?? null;

      if (fcmToken && typeof fcmToken === 'string' && fcmToken.length > 10) {
        console.log(`[FCM][TOKEN] ✅ Real Native FCM token generated successfully: ${fcmToken.slice(0, 25)}...`);
        return fcmToken;
      }
    } catch (tokenErr: any) {
      const errMsg = tokenErr?.message || String(tokenErr);
      if (errMsg.includes('FIS_AUTH_ERROR')) {
        console.error(
          '[FCM][TOKEN_ERROR] FIS_AUTH_ERROR: Native FCM token registration failed. Ensure Firebase Installations API & Cloud Messaging API are ENABLED in GCP Console: https://console.cloud.google.com/apis/library/firebaseinstallations.googleapis.com'
        );
      } else {
        console.error('[FCM][TOKEN_ERROR] Native getDevicePushTokenAsync failed:', errMsg);
      }
    }

    console.warn('[FCM][TOKEN] Native FCM token unavailable. Device remains unregistered until native FCM token generation succeeds.');
    return null;
  } catch (err: any) {
    console.error('[FCM][TOKEN_ERROR] Unexpected error in registerForPushNotifications:', err?.message || String(err));
    return null;
  }
};

/**
 * Send the REAL native FCM token to the backend for storage.
 * Does NOT register fake fallback tokens.
 */
export const sendFcmTokenToServer = async (fcmToken: string): Promise<void> => {
  if (!fcmToken || fcmToken.includes('DEV_LOCAL') || fcmToken.includes('ExponentPushToken')) {
    console.warn('[FCM][TOKEN_REGISTER] Rejected non-FCM or synthetic fallback token registration attempt.');
    return;
  }

  try {
    const user = getUserProfileStorage();
    const payload = { fcmToken, email: user?.email };

    try {
      await apiClient.post('/notifications/fcm-token', payload);
      console.log(`[FCM][TOKEN_REGISTER] ✅ Native FCM token registered with server for ${user?.email || 'authenticated device'}`);
      return;
    } catch (err) {
      // Direct IP fallback retries if primary domain client fails
    }

    const hostIps = ['10.78.118.148', '10.64.3.148', '10.0.2.2', 'localhost'];
    for (const ip of hostIps) {
      try {
        await axios.post(`http://${ip}:5000/api/v1/notifications/fcm-token`, payload, { timeout: 4000 });
        console.log(`[FCM][TOKEN_REGISTER] ✅ Native FCM token registered via fallback IP (${ip})`);
        return;
      } catch {}
    }
  } catch (error) {
    console.error('[FCM][TOKEN_REGISTER] ❌ Failed to send FCM token to backend server:', error);
  }
};

/**
 * Remove the FCM token from the backend (called during logout).
 */
export const removeFcmTokenFromServer = async (fcmToken: string): Promise<void> => {
  try {
    await apiClient.delete('/notifications/fcm-token', { data: { fcmToken } });
    console.log('✅ FCM token removed from server');
  } catch (error) {
    console.error('❌ Failed to remove FCM token from server:', error);
  }
};

import { router } from 'expo-router';

const handleNotificationTap = (data?: Record<string, any>) => {
  if (!data) return;
  const target = data.type || data.screen;
  if (target === 'CLASS_STARTED' || target === 'CLASS_REMINDER' || target === '/classes') {
    router.push('/classes');
  } else if (target === 'COURSE_UPDATE' || target === '/resources') {
    router.push('/resources');
  } else if (target === 'PLACEMENT' || target === '/courses') {
    router.push('/courses');
  } else {
    router.push('/notifications');
  }
};

/**
 * Set up foreground notification listener & tap handlers.
 * Returns a cleanup function to remove the subscription.
 */
export const setupNotificationListeners = (): (() => void) => {
  if (Platform.OS === 'web' || isExpoGo) return () => {};

  try {
    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      const { title, body } = notification.request.content;
      console.log('📬 Notification received in foreground:', title, body);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const { data } = response.notification.request.content;
      console.log('👆 Notification tapped by user:', data);
      handleNotificationTap(data as Record<string, any>);
    });

    // Check if app was launched from a killed state by tapping a notification
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response?.notification?.request?.content?.data) {
        handleNotificationTap(response.notification.request.content.data as Record<string, any>);
      }
    });

    const tokenSubscription = Notifications.addPushTokenListener((tokenData) => {
      const refreshedToken = tokenData?.data;
      if (refreshedToken) {
        console.log('🔄 Native FCM Push Token refreshed on device:', refreshedToken);
        void sendFcmTokenToServer(refreshedToken);
      }
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
      tokenSubscription.remove();
    };
  } catch {
    return () => {};
  }
};

/**
 * Get the current notification badge count.
 */
export const getBadgeCount = async (): Promise<number> => {
  if (Platform.OS === 'web' || isExpoGo) return 0;
  try {
    return await Notifications.getBadgeCountAsync();
  } catch {
    return 0;
  }
};

/**
 * Set the notification badge count.
 */
export const setBadgeCount = async (count: number): Promise<void> => {
  if (Platform.OS === 'web' || isExpoGo) return;
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch {
    // Ignore error
  }
};



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
 * Request notification permissions and return the FCM/Expo push token.
 * Returns null if permissions are denied or the device is not physical.
 */
export const registerForPushNotifications = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not already granted with full lockscreen & sound options
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('⚠️ Push notification permission denied');
      return null;
    }

    // Android requires high-priority notification channels for lockscreen & heads-up display
    if (Platform.OS === 'android') {
      const channelAudioAttributes = {
        usage: Notifications.AndroidAudioUsage.NOTIFICATION,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      };

      const channelsToConfigure: Array<{ id: string; name: string; lightColor: string; vibrationPattern: number[] }> = [
        { id: 'vireon_default_v3', name: 'Vireon Notifications', lightColor: '#16A34A', vibrationPattern: [0, 250, 250, 250] },
        { id: 'default', name: 'Vireon General Notifications', lightColor: '#16A34A', vibrationPattern: [0, 250, 250, 250] },
        { id: 'vireon_alerts_v3', name: 'Vireon Live Class & Exam Alerts', lightColor: '#DC2626', vibrationPattern: [0, 500, 250, 500] },
        { id: 'vireon_alerts', name: 'Vireon Live Alerts', lightColor: '#DC2626', vibrationPattern: [0, 500, 250, 500] },
        { id: 'vireon_reminders_v3', name: 'Vireon Class Reminders', lightColor: '#2563EB', vibrationPattern: [0, 250, 250, 250] },
        { id: 'vireon_reminders', name: 'Vireon Reminders', lightColor: '#2563EB', vibrationPattern: [0, 250, 250, 250] },
        { id: 'vireon_placements_v3', name: 'Vireon Placement & Hiring Drives', lightColor: '#D97706', vibrationPattern: [0, 400, 200, 400] },
        { id: 'vireon_placements', name: 'Vireon Placements', lightColor: '#D97706', vibrationPattern: [0, 400, 200, 400] },
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
    }

    // Attempt 1: Fetch native device FCM push token
    try {
      const tokenData = await Notifications.getDevicePushTokenAsync();
      const fcmToken = tokenData?.data ?? null;
      if (fcmToken) {
        console.log('📱 ✅ Registered native FCM token:', fcmToken.slice(0, 30) + '...');
        return fcmToken;
      }
    } catch (e: any) {
      const errMsg = e?.message || String(e);
      if (errMsg.includes('FIS_AUTH_ERROR')) {
        console.log(
          'ℹ️ [FCM] FIS_AUTH_ERROR — native FCM token unavailable. Enable Firebase Installations API at: https://console.cloud.google.com/apis/library/firebaseinstallations.googleapis.com'
        );
      } else {
        console.warn('⚠️ getDevicePushTokenAsync failed:', errMsg);
      }
    }

    // Attempt 2: Expo Push Token (works even when native FCM fails)
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const expoTokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      const expoToken = expoTokenData?.data;
      if (expoToken) {
        console.log('📱 ✅ Registered Expo Push Token:', expoToken);
        return expoToken;
      }
    } catch (expoErr: any) {
      const errMsg = expoErr?.message || String(expoErr);
      if (errMsg.includes('FIS_AUTH_ERROR')) {
        console.warn('⚠️ getExpoPushTokenAsync failed with FIS_AUTH_ERROR (Firebase Installations API disabled in GCP Console)');
      } else {
        console.warn('⚠️ getExpoPushTokenAsync failed:', errMsg);
      }
    }

    if (__DEV__) {
      const devFallbackToken = `ExponentPushToken[DEV_LOCAL_${Device.modelName ? Device.modelName.replace(/\s+/g, '_') : 'EMULATOR'}]`;
      console.log('ℹ️ [FCM DEV FALLBACK] Registering local DEV push token:', devFallbackToken);
      return devFallbackToken;
    }

    return null;
  } catch (err) {
    console.warn('⚠️ registerForPushNotifications outer error:', err);
    return null;
  }
};

/**
 * Send the FCM token to the backend for storage with multi-IP fail-safe retries.
 */
export const sendFcmTokenToServer = async (fcmToken: string): Promise<void> => {
  try {
    const user = getUserProfileStorage();
    const payload = { fcmToken, email: user?.email };

    try {
      await apiClient.post('/notifications/fcm-token', payload);
      console.log('✅ FCM token registered with server:', fcmToken.slice(0, 25) + '...');
      return;
    } catch {
      // Primary API client failed — fallback to direct IP retries
    }

    const hostIps = ['10.78.118.148', '10.64.3.148', '10.0.2.2', 'localhost'];
    for (const ip of hostIps) {
      try {
        await axios.post(`http://${ip}:5000/api/v1/notifications/fcm-token`, payload, { timeout: 4000 });
        console.log(`✅ FCM token registered via fallback IP (${ip}):`, fcmToken.slice(0, 25) + '...');
        return;
      } catch {}
    }
  } catch (error) {
    console.error('❌ Failed to register FCM token with server:', error);
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

/**
 * Schedule a test notification in 5 seconds with MAX importance & PUBLIC lockscreen visibility.
 * Useful for testing lock screen notifications on physical devices directly.
 */
export const scheduleTestLockScreenNotification = async (delaySeconds = 5): Promise<boolean> => {
  if (Platform.OS === 'web') return false;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return false;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('vireon_alerts_v3', {
        name: 'Vireon Live Class & Exam Alerts',
        importance: Notifications.AndroidImportance.MAX,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#DC2626',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
        bypassDnd: true,
        audioAttributes: {
          usage: Notifications.AndroidAudioUsage.NOTIFICATION,
          contentType: Notifications.AndroidAudioContentType.SONIFICATION,
        },
      });
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚨 LIVE CLASS: Advanced Safety & Lock Screen Test',
        body: 'This high-priority notification was pushed with PUBLIC lock screen visibility. Tap to launch classroom!',
        sound: true,
        badge: 1,
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 500, 250, 500],
        data: { type: 'CLASS_STARTED', screen: '/classes' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: delaySeconds,
      },
    });
    return true;
  } catch (error) {
    console.error('Failed to schedule test lock screen notification:', error);
    return false;
  }
};


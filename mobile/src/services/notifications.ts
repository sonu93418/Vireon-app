// ============================================================
// VIREON MOBILE — PUSH NOTIFICATION SERVICE
// Firebase Cloud Messaging via expo-notifications
// ============================================================
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import apiClient, { getAccessToken } from './api';

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
  if (Platform.OS === 'web' || !Device.isDevice || isExpoGo) {
    if (isExpoGo) console.log('ℹ️ Push notifications are not available in Expo Go (SDK 53+). Use a Development Build.');
    else console.log('⚠️ Push notifications require a physical mobile device');
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

    // Android requires a high-priority notification channel for lockscreen display
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Vireon Notifications',
        importance: Notifications.AndroidImportance.MAX,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#16A34A',
        enableLights: true,
        enableVibrate: true,
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('vireon_alerts', {
        name: 'Vireon Class & Exam Alerts',
        importance: Notifications.AndroidImportance.MAX,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#16A34A',
        enableLights: true,
        enableVibrate: true,
        sound: 'default',
      });
    }

    try {
      const tokenData = await Notifications.getDevicePushTokenAsync();
      const fcmToken = tokenData?.data ?? null;
      return fcmToken;
    } catch {
      // FirebaseApp not initialized natively in this build environment
      return null;
    }
  } catch {
    return null;
  }
};

/**
 * Send the FCM token to the backend for storage.
 */
export const sendFcmTokenToServer = async (fcmToken: string): Promise<void> => {
  const accessToken = getAccessToken();
  if (!accessToken) return; // Not logged in yet

  try {
    await apiClient.post('/notifications/fcm-token', { fcmToken });
    console.log('✅ FCM token registered with server');
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

/**
 * Set up foreground notification listener.
 * Returns a cleanup function to remove the subscription.
 */
export const setupNotificationListeners = (): (() => void) => {
  if (Platform.OS === 'web' || isExpoGo) return () => {};

  try {
    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      const { title, body } = notification.request.content;
      console.log('📬 Notification received:', title, body);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const { data } = response.notification.request.content;
      console.log('👆 Notification tapped:', data);
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
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

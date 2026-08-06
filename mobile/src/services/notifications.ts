// ============================================================
// VIREON MOBILE — PUSH NOTIFICATION SERVICE
// Firebase Cloud Messaging via expo-notifications
// ============================================================
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import apiClient, { getAccessToken } from './api';

// ─── Configure notification behavior safely for native platforms ─────────────
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Request notification permissions and return the FCM/Expo push token.
 * Returns null if permissions are denied or the device is not physical.
 */
export const registerForPushNotifications = async (): Promise<string | null> => {
  if (Platform.OS === 'web' || !Device.isDevice) {
    console.log('⚠️ Push notifications require a physical mobile device');
    return null;
  }

  try {
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('⚠️ Push notification permission denied');
      return null;
    }

    // Android requires a notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Vireon Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#16A34A',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
      });
    }

    const tokenData = await Notifications.getDevicePushTokenAsync();
    const fcmToken = tokenData.data;

    console.log('✅ FCM Device Token:', fcmToken);
    return fcmToken;
  } catch (error) {
    console.error('❌ Failed to get push token:', error);
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
  if (Platform.OS === 'web') return () => {};

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
  if (Platform.OS === 'web') return 0;
  return Notifications.getBadgeCountAsync();
};

/**
 * Set the notification badge count.
 */
export const setBadgeCount = async (count: number): Promise<void> => {
  if (Platform.OS === 'web') return;
  await Notifications.setBadgeCountAsync(count);
};

// ============================================================
// VIREON MOBILE — GOOGLE SIGN-IN SERVICE
// Handles real Google OAuth using @react-native-google-signin/google-signin
// ============================================================
import { Platform, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';

export const ANDROID_DEBUG_SHA1 = 'A8:C3:91:9C:3F:F0:6D:DF:0C:00:10:19:82:BD:CF:4A:4A:22:1A:05';
export const ANDROID_DEBUG_SHA256 = '49:31:FE:32:4C:63:B1:5F:12:FC:3E:4C:6E:E2:02:A6:B6:1F:08:8E:A4:59:76:90:98:0A:2B:2F:24:7F:9D:07';

let GoogleSignin: any = null;
let isSuccessResponse: any = null;
let statusCodes: any = null;

// Dynamically load native module whenever native platform is present
if (Platform.OS !== 'web') {
  try {
    const googleSigninModule = require('@react-native-google-signin/google-signin');
    GoogleSignin = googleSigninModule.GoogleSignin;
    isSuccessResponse = googleSigninModule.isSuccessResponse;
    statusCodes = googleSigninModule.statusCodes;
  } catch (e) {
    console.warn('⚠️ Google Sign-In native module unavailable in current environment:', e);
  }
}

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '52937404971-e0vqiesg2fqjktgtaoba5n06fs5utdor.apps.googleusercontent.com';
const isPlaceholderClientId = !WEB_CLIENT_ID || WEB_CLIENT_ID.includes('your_web_client_id');

/** Track whether configure has been called successfully */
let isConfigured = false;

/**
 * Configure Google Sign-In safely.
 * Must be called before signIn(). Safe to call multiple times.
 */
export const configureGoogleSignIn = (): void => {
  if (Platform.OS === 'web' || !GoogleSignin || isPlaceholderClientId) {
    if (__DEV__) {
      console.log('ℹ️ [GoogleAuth] Skipping configure:', {
        platform: Platform.OS,
        hasModule: !!GoogleSignin,
        isPlaceholder: isPlaceholderClientId,
        webClientId: WEB_CLIENT_ID ? `${WEB_CLIENT_ID.substring(0, 20)}...` : 'MISSING',
      });
    }
    return;
  }

  try {
    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      offlineAccess: false,
      scopes: ['profile', 'email'],
      forceCodeForRefreshToken: false,
    });
    isConfigured = true;
    if (__DEV__) {
      console.log('✅ [GoogleAuth] Configured successfully with webClientId:', WEB_CLIENT_ID.substring(0, 20) + '...');
    }
  } catch (error) {
    console.warn('⚠️ [GoogleAuth] Configure error:', error);
    isConfigured = false;
  }
};

export interface GoogleAuthResult {
  idToken: string;
  email?: string;
  fullName?: string;
  avatarUrl?: string;
}

/**
 * Get build context info for debugging.
 */
const getBuildInfo = () => ({
  platform: Platform.OS,
  version: Platform.Version,
  isDev: __DEV__,
  appVersion: Constants.expoConfig?.version ?? 'unknown',
  runtimeVersion: Constants.expoConfig?.runtimeVersion ?? 'unknown',
  executionEnvironment: Constants.executionEnvironment,
});

/**
 * Trigger Google Sign-In flow safely across Expo Go, Web, and Native Builds.
 * Always prompts the user to select their Google Account.
 */
export const signInWithGoogle = async (): Promise<GoogleAuthResult | null> => {
  if (Platform.OS === 'web' || !GoogleSignin) {
    Alert.alert(
      'Google Sign-In',
      'Google Sign-In requires a native Android/iOS build. It is not available in Expo Go or Web.',
    );
    return null;
  }

  try {
    // 1. Ensure configured first
    if (!isConfigured) {
      configureGoogleSignIn();
    }

    if (!isConfigured) {
      console.error('❌ [GoogleAuth] Failed to configure Google Sign-In. Cannot proceed.');
      Alert.alert('Google Sign-In Error', 'Google Sign-In could not be configured. Please check your app setup.');
      return null;
    }

    // 2. Ensure Google Play Services are available
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // FORCE GOOGLE ACCOUNT PICKER PROMPT: Clear cached session before signing in
    try {
      await GoogleSignin.signOut();
    } catch {
      // Ignore error if no cached session exists
    }

    console.log('🔄 [GoogleAuth] Starting sign-in flow...', getBuildInfo());

    const response = await GoogleSignin.signIn();

    let userEmail: string | undefined;
    let userName: string | undefined;
    let userPhoto: string | undefined;
    let idToken: string | undefined;

    if (isSuccessResponse && isSuccessResponse(response)) {
      const gUser = response.data?.user;
      userEmail = gUser?.email;
      userName = gUser?.name;
      userPhoto = gUser?.photo ?? undefined;
      idToken = response.data?.idToken ?? undefined;
    } else {
      const gUser = (response as any)?.user;
      userEmail = gUser?.email;
      userName = gUser?.name;
      userPhoto = gUser?.photo ?? undefined;
      idToken = (response as any)?.idToken ?? undefined;
    }

    if (!idToken) {
      console.error('❌ [GoogleAuth] No idToken in response:', {
        hasEmail: !!userEmail,
        hasUser: !!response,
        responseKeys: response ? Object.keys(response) : [],
        buildInfo: getBuildInfo(),
      });
      Alert.alert(
        'Google Sign-In Error',
        'Google Sign-In did not return an authentication token. This usually means the SHA-1 fingerprint of this APK is not registered in Firebase Console.\n\nPlease contact support or try again.',
      );
      return null;
    }

    if (!userEmail) {
      console.error('❌ [GoogleAuth] No email in response but have idToken');
      Alert.alert('Google Sign-In Error', 'Your Google account did not provide an email address.');
      return null;
    }

    console.log(`✅ [GoogleAuth] Account selected: ${userEmail}`);

    return {
      idToken,
      email: userEmail,
      fullName: userName ?? userEmail.split('@')[0],
      avatarUrl: userPhoto,
    };
  } catch (error: any) {
    // ── User Cancelled ──
    if (error?.code === statusCodes?.SIGN_IN_CANCELLED) {
      console.log('ℹ️ [GoogleAuth] User cancelled account selection');
      return null;
    }

    // ── Already In Progress ──
    if (error?.code === statusCodes?.IN_PROGRESS) {
      console.log('ℹ️ [GoogleAuth] Sign-in operation already in progress');
      return null;
    }

    // ── DEVELOPER_ERROR (code 10) — SHA-1 mismatch ──
    const isDevError =
      error?.code === 10 ||
      error?.code === '10' ||
      error?.code === statusCodes?.DEVELOPER_ERROR ||
      String(error?.message).includes('DEVELOPER_ERROR') ||
      String(error).includes('DEVELOPER_ERROR');

    if (isDevError) {
      console.error('❌ [GoogleAuth] DEVELOPER_ERROR (10): SHA-1 fingerprint mismatch!', {
        errorCode: error?.code,
        errorMessage: error?.message,
        webClientId: WEB_CLIENT_ID ? `${WEB_CLIENT_ID.substring(0, 20)}...` : 'MISSING',
        buildInfo: getBuildInfo(),
      });

      if (__DEV__) {
        // In development, show SHA-1 copy option + dev mock fallback
        return new Promise<GoogleAuthResult | null>((resolve) => {
          Alert.alert(
            'Google Sign-In: Configuration Required',
            `Google Play Services returned error 10 (DEVELOPER_ERROR).\n\nTo resolve this in Google Cloud Console / Firebase:\n1. Open Google Cloud Project 52937404971 (or Firebase Console)\n2. Add Android OAuth Client for 'com.vireon.safety'\n3. Add SHA-1:\n${ANDROID_DEBUG_SHA1}`,
            [
              {
                text: '📋 Copy SHA-1',
                onPress: async () => {
                  await Clipboard.setStringAsync(ANDROID_DEBUG_SHA1);
                  Alert.alert('Copied!', 'SHA-1 copied to clipboard. Paste it into Google Cloud Console → Credentials → Android OAuth Client.');
                  resolve(null);
                },
              },
              {
                text: '🧪 Test Login (Dev)',
                style: 'default',
                onPress: () => {
                  resolve({
                    idToken: 'mock_sonukumarray1009@gmail.com',
                    email: 'sonukumarray1009@gmail.com',
                    fullName: 'Sonu Kumar Ray',
                    avatarUrl: 'https://lh3.googleusercontent.com/a/default-user',
                  });
                },
              },
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => resolve(null),
              },
            ],
          );
        });
      } else {
        // In Preview/Production builds, show informative alert
        return new Promise<GoogleAuthResult | null>((resolve) => {
          Alert.alert(
            'Google Sign-In Error',
            `Google Play Services returned error 10 (DEVELOPER_ERROR).\n\nThe signing certificate (SHA-1) for this build is not registered in Google Cloud Console under package 'com.vireon.safety'.\n\nSHA-1:\n${ANDROID_DEBUG_SHA1}`,
            [
              {
                text: '📋 Copy SHA-1',
                onPress: async () => {
                  await Clipboard.setStringAsync(ANDROID_DEBUG_SHA1);
                  Alert.alert(
                    'Copied!',
                    'SHA-1 copied to clipboard. Add this SHA-1 to Google Cloud Console (Project 52937404971) under Android OAuth Client ID.',
                  );
                  resolve(null);
                },
              },
              {
                text: 'OK',
                style: 'cancel',
                onPress: () => resolve(null),
              },
            ],
          );
        });
      }
    }

    // ── Play Services Not Available ──
    if (error?.code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
      console.error('❌ [GoogleAuth] Google Play Services not available:', error);
      Alert.alert('Google Play Services Required', 'Google Play Services is not available on this device. Please install or update Google Play Services.');
      return null;
    }

    // ── Unknown Error ──
    console.error('❌ [GoogleAuth] Unexpected error:', {
      code: error?.code,
      message: error?.message,
      stack: error?.stack,
      buildInfo: getBuildInfo(),
    });
    Alert.alert('Google Sign-In Error', error?.message || 'Failed to sign in with Google. Please try again.');

    return null;
  }
};

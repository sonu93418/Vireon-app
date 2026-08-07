// ============================================================
// VIREON MOBILE — GOOGLE SIGN-IN SERVICE
// Handles Google OAuth using @react-native-google-signin
// ============================================================
import { Platform, Alert } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

let GoogleSignin: any = null;
let isSuccessResponse: any = null;
let isErrorWithCode: any = null;
let statusCodes: any = null;

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const isWeb = Platform.OS === 'web';

// Only load native module if not in Web and not in standard Expo Go
if (!isWeb && !isExpoGo) {
  try {
    const googleSigninModule = require('@react-native-google-signin/google-signin');
    GoogleSignin = googleSigninModule.GoogleSignin;
    isSuccessResponse = googleSigninModule.isSuccessResponse;
    isErrorWithCode = googleSigninModule.isErrorWithCode;
    statusCodes = googleSigninModule.statusCodes;
  } catch {
    console.warn('⚠️ Google Sign-In native module unavailable in current environment');
  }
}

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

/**
 * Configure Google Sign-In safely.
 */
export const configureGoogleSignIn = (): void => {
  if (isWeb || isExpoGo || !GoogleSignin) {
    console.log('ℹ️ Google Sign-In requires a Development Build on mobile');
    return;
  }

  try {
    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      offlineAccess: false,
      scopes: ['profile', 'email'],
    });
  } catch (error) {
    console.warn('⚠️ Google Sign-In configure warning:', error);
  }
};

export interface GoogleAuthResult {
  idToken: string;
  email?: string;
  fullName?: string;
  avatarUrl?: string;
}

/**
 * Trigger Google Sign-In flow safely.
 */
export const signInWithGoogle = async (): Promise<GoogleAuthResult | null> => {
  if (isWeb || isExpoGo || !GoogleSignin) {
    Alert.alert(
      'Google Sign-In Notice',
      'Google OAuth requires a custom build with SHA-1 registered in Google Cloud Console. Please sign in or register using your Email and Password for your real user account.'
    );
    return null;
  }

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (isSuccessResponse && isSuccessResponse(response)) {
      const gUser = response.data?.user;
      return {
        idToken: response.data?.idToken ?? '',
        email: gUser?.email,
        fullName: gUser?.name,
        avatarUrl: gUser?.photo,
      };
    }

    const gUser = response?.user;
    return {
      idToken: response?.idToken ?? '',
      email: gUser?.email,
      fullName: gUser?.name,
      avatarUrl: gUser?.photo,
    };
  } catch (error: any) {
    const isDevError =
      error?.code === 10 ||
      error?.code === '10' ||
      error?.code === statusCodes?.DEVELOPER_ERROR ||
      String(error?.message).includes('DEVELOPER_ERROR') ||
      String(error).includes('DEVELOPER_ERROR');

    if (isDevError) {
      Alert.alert(
        'Google OAuth Setup Instructions',
        'Google Sign-In DEVELOPER_ERROR (code 10):\n\n' +
        '• Package Name: com.vireon.safety\n' +
        '• SHA-1 Fingerprint: A8:C3:91:9C:3F:F0:6D:DF:0C:00:10:19:82:BD:CF:4A:4A:22:1A:05\n\n' +
        'Add this SHA-1 in Firebase / Google Cloud Console under Project Settings → Add Fingerprint.',
        [{ text: 'Got It', style: 'default' }]
      );
      return null;
    }

    if (isErrorWithCode && isErrorWithCode(error)) {
      switch (error.code) {
        case statusCodes?.SIGN_IN_CANCELLED:
          return null;
        case statusCodes?.IN_PROGRESS:
          return null;
        case statusCodes?.PLAY_SERVICES_NOT_AVAILABLE:
          Alert.alert('Google Play Services', 'Google Play Services is not available on this device');
          return null;
        default:
          return null;
      }
    }

    return null;
  }
};

/**
 * Sign out from Google safely.
 */
export const signOutFromGoogle = async (): Promise<void> => {
  if (!GoogleSignin) return;
  try {
    await GoogleSignin.signOut();
  } catch {
    // Silently ignore sign-out errors
  }
};

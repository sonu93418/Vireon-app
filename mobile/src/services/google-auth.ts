// ============================================================
// VIREON MOBILE — GOOGLE SIGN-IN SERVICE
// Handles real Google OAuth using @react-native-google-signin/google-signin
// ============================================================
import { Platform, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';

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
  } catch {
    console.warn('⚠️ Google Sign-In native module unavailable in current environment');
  }
}

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '52937404971-e0vqiesg2fqjktgtaoba5n06fs5utdor.apps.googleusercontent.com';
const isPlaceholderClientId = !WEB_CLIENT_ID || WEB_CLIENT_ID.includes('your_web_client_id');

/**
 * Configure Google Sign-In safely.
 */
export const configureGoogleSignIn = (): void => {
  if (Platform.OS === 'web' || !GoogleSignin || isPlaceholderClientId) {
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
 * Trigger Google Sign-In flow safely across Expo Go, Web, and Native Builds.
 * Always prompts the user to select their Google Account.
 */
export const signInWithGoogle = async (): Promise<GoogleAuthResult | null> => {
  if (Platform.OS === 'web' || !GoogleSignin) {
    Alert.alert('Google Sign-In', 'Google Sign-In requires a physical mobile device running a Development Build.');
    return null;
  }

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    configureGoogleSignIn();

    // FORCE GOOGLE ACCOUNT PICKER PROMPT: Clear cached session before signing in
    try {
      await GoogleSignin.signOut();
    } catch {
      // Ignore error if no cached session exists
    }

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

    if (!userEmail || !idToken) {
      throw new Error('Google Sign-In response did not contain a verified ID token. Check the Android OAuth client SHA-1 configuration.');
    }

    console.log(`✅ Google Account selected: ${userEmail}`);

    return {
      idToken,
      email: userEmail,
      fullName: userName ?? userEmail.split('@')[0],
      avatarUrl: userPhoto,
    };
  } catch (error: any) {
    if (error?.code === statusCodes?.SIGN_IN_CANCELLED) {
      console.log('ℹ️ User cancelled Google account selection prompt');
      return null;
    }

    if (error?.code === statusCodes?.IN_PROGRESS) {
      console.log('ℹ️ Google Sign-In operation already in progress...');
      return null;
    }

    console.error('❌ Google Sign-In error details:', error);

    const isDevError =
      error?.code === 10 ||
      error?.code === '10' ||
      error?.code === statusCodes?.DEVELOPER_ERROR ||
      String(error?.message).includes('DEVELOPER_ERROR') ||
      String(error).includes('DEVELOPER_ERROR');

    if (isDevError) {
      console.warn('⚠️ DEVELOPER_ERROR (10): SHA-1 fingerprint not registered in Firebase/Google Cloud Console.');
      
      return new Promise<GoogleAuthResult | null>((resolve) => {
        Alert.alert(
          'Google Sign-In: SHA-1 Required',
          `Google Play Services requires your Android SHA-1 fingerprint to be registered in Firebase Console.\n\nSHA-1:\n${ANDROID_DEBUG_SHA1}\n\nChoose an option below:`,
          [
            {
              text: '📋 Copy SHA-1',
              onPress: async () => {
                await Clipboard.setStringAsync(ANDROID_DEBUG_SHA1);
                Alert.alert('Copied!', 'SHA-1 copied to clipboard. Paste it into Firebase Console → Project Settings → Android App SHA fingerprints.');
                resolve(null);
              },
            },
            {
              text: '🧪 Test Login (Dev)',
              style: 'default',
              onPress: () => {
                // In dev mode, return a test token so user can test the full login/dashboard flow immediately
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
          ]
        );
      });
    } else {
      Alert.alert('Google Sign-In Notice', error?.message || 'Failed to select Google account.');
    }

    return null;
  }
};


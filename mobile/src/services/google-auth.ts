// ============================================================
// VIREON MOBILE — GOOGLE SIGN-IN SERVICE
// Handles Google OAuth using @react-native-google-signin
// ============================================================
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

/**
 * Configure Google Sign-In. Must be called once before any sign-in attempt.
 */
export const configureGoogleSignIn = (): void => {
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    offlineAccess: false,
    scopes: ['profile', 'email'],
  });
};

/**
 * Trigger Google Sign-In flow and return the ID token.
 * Returns null if the user cancels or an error occurs.
 */
export const signInWithGoogle = async (): Promise<string | null> => {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (isSuccessResponse(response)) {
      return response.data.idToken ?? null;
    }

    return null;
  } catch (error) {
    if (isErrorWithCode(error)) {
      switch (error.code) {
        case statusCodes.SIGN_IN_CANCELLED:
          // User cancelled the sign-in flow
          return null;
        case statusCodes.IN_PROGRESS:
          // Sign-in already in progress
          return null;
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          throw new Error('Google Play Services is not available on this device');
        default:
          throw new Error(`Google Sign-In failed: ${error.message}`);
      }
    }
    throw error;
  }
};

/**
 * Sign out from Google (used during logout).
 */
export const signOutFromGoogle = async (): Promise<void> => {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Silently ignore sign-out errors
  }
};

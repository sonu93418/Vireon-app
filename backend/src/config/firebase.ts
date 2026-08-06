// ============================================================
// VIREON — FIREBASE ADMIN SDK CONFIGURATION
// ============================================================
import admin from 'firebase-admin';
import { logger } from './logger';

let firebaseApp: admin.app.App | null = null;

export const configureFirebase = (): void => {
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    logger.warn('⚠️  Firebase credentials missing. Push notifications will be disabled.');
    return;
  }

  try {
    if (admin.apps.length > 0) {
      firebaseApp = admin.apps[0] ?? null;
      return;
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });

    logger.info('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    logger.error('❌ Firebase initialization failed:', error);
    throw error;
  }
};

export const getFirebaseMessaging = (): admin.messaging.Messaging => {
  if (!firebaseApp) {
    throw new Error('Firebase is not initialized. Call configureFirebase() first.');
  }
  return admin.messaging(firebaseApp);
};

export { admin };

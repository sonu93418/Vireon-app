// ============================================================
// VIREON — AUTH ROUTES
// /api/v1/auth/*
// ============================================================
import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authRateLimiter } from '../../middlewares/rateLimiter.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  registerSchema,
  loginWithEmailSchema,
  loginWithPhoneSchema,
  loginWithGoogleSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from '@vireon/shared/schemas';
import { z } from 'zod';

const router = Router();
const controller = new AuthController();

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterInput'
 *     responses:
 *       201:
 *         description: Registration successful, OTP sent to email
 *       409:
 *         description: Email or phone already registered
 */
router.post('/register', authRateLimiter, validate({ body: registerSchema }), controller.register);

/**
 * @swagger
 * /api/v1/auth/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify OTP for email/phone verification or forgot password
 */
router.post('/verify-otp', authRateLimiter, validate({ body: verifyOtpSchema }), controller.verifyOtp);

/**
 * @swagger
 * /api/v1/auth/resend-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Resend OTP to email
 */
router.post(
  '/resend-otp',
  authRateLimiter,
  validate({
    body: z.object({
      identifier: z.string().min(1),
      purpose: z.string().min(1),
    }),
  }),
  controller.resendOtp
);

/**
 * @swagger
 * /api/v1/auth/login/email:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 */
router.post('/login/email', authRateLimiter, validate({ body: loginWithEmailSchema }), controller.loginWithEmail);

/**
 * @swagger
 * /api/v1/auth/login/phone:
 *   post:
 *     tags: [Auth]
 *     summary: Login with phone number and password
 */
router.post('/login/phone', authRateLimiter, validate({ body: loginWithPhoneSchema }), controller.loginWithPhone);

/**
 * @swagger
 * /api/v1/auth/login/google:
 *   post:
 *     tags: [Auth]
 *     summary: Login or register with Google OAuth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             properties:
 *               idToken:
 *                 type: string
 *               fcmToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid Google token
 */
router.post('/login/google', authRateLimiter, validate({ body: loginWithGoogleSchema }), controller.loginWithGoogle);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token using refresh token
 */
router.post('/refresh', validate({ body: refreshTokenSchema }), controller.refreshToken);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout from current device
 *     security:
 *       - BearerAuth: []
 */
router.post('/logout', authenticate, validate({ body: refreshTokenSchema }), controller.logout);

/**
 * @swagger
 * /api/v1/auth/logout-all:
 *   post:
 *     tags: [Auth]
 *     summary: Logout from all devices
 *     security:
 *       - BearerAuth: []
 */
router.post('/logout-all', authenticate, controller.logoutAllDevices);

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Initiate forgot password flow
 */
router.post('/forgot-password', authRateLimiter, validate({ body: forgotPasswordSchema }), controller.forgotPassword);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password with OTP verification
 */
router.post(
  '/reset-password',
  authRateLimiter,
  validate({
    body: z.object({
      email: z.string().email(),
      otp: z.string().length(6),
      password: z.string().min(8),
    }),
  }),
  controller.resetPassword
);

/**
 * @swagger
 * /api/v1/auth/change-password:
 *   patch:
 *     tags: [Auth]
 *     summary: Change password for authenticated user
 *     security:
 *       - BearerAuth: []
 */
router.patch('/change-password', authenticate, validate({ body: changePasswordSchema }), controller.changePassword);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current authenticated user profile
 *     security:
 *       - BearerAuth: []
 */
router.get('/me', authenticate, controller.me);

export default router;

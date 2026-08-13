// ============================================================
// VIREON — AUTH SERVICE
// Business logic for authentication flows
// ============================================================
import { AuthRepository } from './auth.repository';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../../utils/jwt.util';
import {
  sendOtpEmail,
  sendWelcomeEmail,
} from '../../utils/mailer.util';
import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from '../../core/errors';
import { UserStatus, OtpPurpose, AuthProvider, UserRole } from '../../shared';
import type {
  RegisterInput,
  LoginWithEmailInput,
  LoginWithPhoneInput,
  VerifyOtpInput,
  ChangePasswordInput,
  LoginWithGoogleInput,
} from '../../shared/schemas';
import { IUserDocument } from '../../models/user.model';
import { admin } from '../../config/firebase';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthResult {
  user: Partial<IUserDocument>;
  tokens: AuthTokens;
}

export class AuthService {
  private readonly repo: AuthRepository;

  constructor() {
    this.repo = new AuthRepository();
  }

  async register(input: RegisterInput): Promise<{ message: string }> {
    const { fullName, email, phone, password, role } = input;

    // Check for existing user
    const existing = await this.repo.findOne({
      $or: [{ email: email.toLowerCase() }, { phone }],
    });

    if (existing) {
      const field = existing.email === email.toLowerCase() ? 'Email' : 'Phone number';
      throw new ConflictError(`${field} is already registered`);
    }

    const passwordHash = await this.repo.hashPassword(password);

    const user = await this.repo.create({
      fullName: fullName.trim(),
      email: email.toLowerCase(),
      phone,
      passwordHash,
      role,
      isEmailVerified: true,
      status: UserStatus.ACTIVE,
    });

    // Send welcome email asynchronously in background
    void sendWelcomeEmail(email, fullName).catch(() => { });

    return { message: 'Registration successful. You can now log in.' };
  }

  async verifyOtp(input: VerifyOtpInput): Promise<{ message: string }> {
    const { identifier, otp, purpose } = input;

    const isValid = await this.repo.verifyOtp(identifier.toLowerCase(), otp, purpose);
    if (!isValid) {
      throw new BadRequestError('Invalid or expired OTP. Please request a new one.', 'INVALID_OTP');
    }

    if (purpose === OtpPurpose.EMAIL_VERIFICATION) {
      const user = await this.repo.findOne({ email: identifier.toLowerCase() });
      if (user) {
        await this.repo.updateById(String(user._id), {
          isEmailVerified: true,
          status: UserStatus.ACTIVE,
        });
        await sendWelcomeEmail(user.email, user.fullName);
      }
    }

    return { message: 'OTP verified successfully' };
  }

  async loginWithEmail(input: LoginWithEmailInput): Promise<AuthResult> {
    const { email, password, fcmToken } = input;

    const user = await this.repo.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedError('Your account has been suspended. Contact support.', 'ACCOUNT_SUSPENDED');
    }

    const isPasswordValid = await this.repo.comparePassword(user, password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Auto-verify if unverified
    if (!user.isEmailVerified || user.status === UserStatus.PENDING_VERIFICATION) {
      await this.repo.updateById(String(user._id), {
        isEmailVerified: true,
        status: UserStatus.ACTIVE,
      });
      user.isEmailVerified = true;
      user.status = UserStatus.ACTIVE;
    }

    return this.generateAuthResult(user, fcmToken);
  }

  async loginWithPhone(input: LoginWithPhoneInput): Promise<AuthResult> {
    const { phone, password, fcmToken } = input;

    const user = await this.repo.findByPhone(phone);
    if (!user) {
      throw new UnauthorizedError('Invalid phone number or password');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedError('Your account has been suspended. Contact support.', 'ACCOUNT_SUSPENDED');
    }

    const isPasswordValid = await this.repo.comparePassword(user, password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid phone number or password');
    }

    return this.generateAuthResult(user, fcmToken);
  }

  private async verifyGoogleIdToken(idToken: string): Promise<{
    sub: string;
    email: string;
    email_verified: boolean;
    name?: string;
    picture?: string;
  }> {
    const { logger } = require('../../config/logger');
    logger.info('🔐 [Google Auth] Google Sign-In Started — Token Received');

    // Dev mock token handling (Only allowed in non-production environment)
    if (
      process.env.NODE_ENV === 'development' &&
      (idToken.startsWith('mock_') || idToken.startsWith('demo_') || idToken.startsWith('real_'))
    ) {
      logger.info('🧪 [Google Auth] Using Development Mock Token');
      const mockEmail = idToken.includes('@')
        ? idToken.replace(/^(mock_|demo_|real_)/, '')
        : 'sonukumarray1009@gmail.com';
      return {
        sub: `google_${mockEmail.replace(/[^a-z0-9]/gi, '_')}`,
        email: mockEmail,
        email_verified: true,
        name: 'Google User',
        picture: 'https://lh3.googleusercontent.com/a/default-user',
      };
    }

    const allowedAudiences = [
      process.env.GOOGLE_WEB_CLIENT_ID,
      process.env.GOOGLE_ANDROID_CLIENT_ID,
    ].filter(Boolean) as string[];

    // 1. Official Google OAuth2 Client Verification
    try {
      const { OAuth2Client } = require('google-auth-library');
      const googleOAuthClient = new OAuth2Client();
      const ticket = await googleOAuthClient.verifyIdToken({
        idToken,
        audience: allowedAudiences.length > 0 ? allowedAudiences : undefined,
      });
      const payload = ticket.getPayload();
      if (!payload) throw new UnauthorizedError('Invalid Google ID token payload');

      logger.info(`✅ [Google Auth] Token Verified via Google Auth Library for ${payload.email}`);
      return {
        sub: payload.sub,
        email: payload.email ?? '',
        email_verified: payload.email_verified ?? false,
        name: payload.name,
        picture: payload.picture,
      };
    } catch {
      // 2. Secondary Strategy: Firebase Admin SDK ID Token Verification
      try {
        const firebaseToken = await admin.auth().verifyIdToken(idToken);
        logger.info(`✅ [Google Auth] Token Verified via Firebase Admin for ${firebaseToken.email}`);
        return {
          sub: firebaseToken.uid,
          email: firebaseToken.email ?? '',
          email_verified: (firebaseToken as any).email_verified ?? true,
          name: firebaseToken.name,
          picture: firebaseToken.picture,
        };
      } catch {
        logger.error('❌ [Google Auth] Authorization Failed: Token verification failed on all strategies');
        throw new UnauthorizedError('Invalid or unverified Google ID token. Access denied.', 'INVALID_GOOGLE_TOKEN');
      }
    }
  }

  async loginWithGoogle(input: LoginWithGoogleInput): Promise<AuthResult> {
    const { idToken, fcmToken } = input;
    const { logger } = require('../../config/logger');

    if (!idToken) {
      throw new BadRequestError('Google ID token is required');
    }

    // Step 1: Verify Google ID Token (Signature, Audience, Expiration, Issuer)
    const googleProfile = await this.verifyGoogleIdToken(idToken);

    const email = googleProfile.email.toLowerCase();
    const googleId = googleProfile.sub;
    const name = googleProfile.name || email.split('@')[0];
    const picture = googleProfile.picture;

    logger.info(`📧 [Google Auth] Email Extracted: ${email}`);

    // Authorization Rule 1: Must contain email address
    if (!email) {
      logger.error('❌ [Google Auth] Authorization Failed: No email address in Google account');
      throw new UnauthorizedError('Your Google account does not contain a valid email address.');
    }

    // Authorization Rule 2: Email must be verified by Google
    if (googleProfile.email_verified === false) {
      logger.error(`❌ [Google Auth] Authorization Failed: Email ${email} is not verified by Google`);
      throw new UnauthorizedError('Your Google email address is not verified by Google.', 'EMAIL_NOT_VERIFIED');
    }

    logger.info(`🔍 [Google Auth] Database Lookup for email: ${email}`);

    // Step 2: Database Lookup
    let user = await this.repo.findByGoogleId(googleId);
    if (!user) {
      user = await this.repo.findByEmail(email);
    }

    // STRICT REGISTRATION-FIRST POLICY:
    // If user does NOT exist in MongoDB, DO NOT auto-register and DO NOT issue JWT!
    if (!user) {
      logger.warn(`⚠️ [Google Auth] Login Denied: Google account ${email} is not registered in MongoDB`);
      throw new UnauthorizedError(
        'This account is not registered. Please register first.',
        'REGISTRATION_REQUIRED'
      );
    }

    // Authorization Rule 3: Check Account Suspension
    if (user.status === UserStatus.SUSPENDED) {
      logger.error(`❌ [Google Auth] Authorization Failed: Account ${email} is suspended`);
      throw new UnauthorizedError('Your account is currently inactive. Please contact support.', 'ACCOUNT_SUSPENDED');
    }

    // Update existing user profile info & last login
    await this.repo.updateById(String(user._id), {
      googleId,
      authProvider: AuthProvider.GOOGLE,
      isEmailVerified: true,
      avatarUrl: picture || user.avatarUrl || undefined,
      lastLoginAt: new Date(),
    });
    user = await this.repo.findById(String(user._id));
    if (!user) throw new NotFoundError('User');

    // Step 3: Issue JWT Session ONLY AFTER Authorization Passes
    logger.info(`🔑 [Google Auth] Authorization Check Passed — Generating JWT for ${user.email}`);
    const result = await this.generateAuthResult(user, fcmToken);
    logger.info(`🎉 [Google Auth] Login Successful for ${user.email}`);
    return result;
  }

  async registerWithGoogle(input: {
    idToken: string;
    phone: string;
    fullName?: string;
    role?: UserRole;
    fcmToken?: string;
  }): Promise<AuthResult> {
    const { idToken, phone, role, fcmToken } = input;
    const { logger } = require('../../config/logger');

    if (!idToken) throw new BadRequestError('Google ID token is required');
    if (!phone) throw new BadRequestError('Mobile phone number is required for registration');

    // Verify Google ID token
    const googleProfile = await this.verifyGoogleIdToken(idToken);
    const email = googleProfile.email.toLowerCase();
    const googleId = googleProfile.sub;
    const name = input.fullName || googleProfile.name || email.split('@')[0];
    const picture = googleProfile.picture;

    // Check if user already exists
    const existing = await this.repo.findOne({
      $or: [{ email }, { googleId }, { phone }],
    });

    if (existing) {
      throw new ConflictError('This account is already registered. Please sign in.');
    }

    // Create user only after form details + verification pass
    const user = await this.repo.create({
      fullName: name.trim(),
      email,
      phone,
      googleId,
      authProvider: AuthProvider.GOOGLE,
      role: role || UserRole.STUDENT,
      isEmailVerified: true,
      status: UserStatus.ACTIVE,
      avatarUrl: picture || undefined,
      lastLoginAt: new Date(),
    });

    logger.info(`🎉 [Google Auth] Registration Completed for new user ${user.email}`);
    return this.generateAuthResult(user, fcmToken);
  }

  async refreshTokens(token: string): Promise<AuthTokens> {
    const payload = verifyRefreshToken(token);

    const user = await this.repo.findById(payload.userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedError('Account is not active');
    }

    const accessToken = generateAccessToken({ userId: String(user._id), role: user.role });
    const refreshToken = generateRefreshToken({ userId: String(user._id), tokenVersion: payload.tokenVersion });

    await this.repo.removeRefreshToken(payload.userId, token);
    await this.repo.addRefreshToken(payload.userId, refreshToken);

    return { accessToken, refreshToken };
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    await this.repo.removeRefreshToken(userId, refreshToken);
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await this.repo.removeAllRefreshTokens(userId);
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.repo.findByEmail(email);
    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If this email exists, you will receive a password reset OTP shortly.' };
    }

    const otp = await this.repo.generateOtp(email.toLowerCase(), OtpPurpose.FORGOT_PASSWORD);
    await sendOtpEmail(email, otp, 'FORGOT_PASSWORD');

    return { message: 'If this email exists, you will receive a password reset OTP shortly.' };
  }

  async resetPassword(email: string, otp: string, newPassword: string): Promise<void> {
    const isValid = await this.repo.verifyOtp(email.toLowerCase(), otp, OtpPurpose.FORGOT_PASSWORD);
    if (!isValid) {
      throw new BadRequestError('Invalid or expired OTP', 'INVALID_OTP');
    }

    const user = await this.repo.findByEmail(email);
    if (!user) throw new NotFoundError('User');

    const passwordHash = await this.repo.hashPassword(newPassword);
    await this.repo.updateById(String(user._id), { passwordHash, refreshTokens: [] });
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundError('User');

    const userWithPassword = await this.repo.findByEmail(user.email);
    if (!userWithPassword) throw new NotFoundError('User');

    const isValid = await userWithPassword.comparePassword(input.currentPassword);
    if (!isValid) {
      throw new BadRequestError('Current password is incorrect', 'INVALID_PASSWORD');
    }

    const passwordHash = await this.repo.hashPassword(input.newPassword);
    await this.repo.updateById(userId, { passwordHash, refreshTokens: [] });
  }

  async resendOtp(identifier: string, purpose: OtpPurpose): Promise<{ message: string }> {
    const otp = await this.repo.generateOtp(identifier.toLowerCase(), purpose);
    await sendOtpEmail(identifier, otp, purpose);
    return { message: 'OTP resent successfully' };
  }

  private async generateAuthResult(user: IUserDocument, fcmToken?: string): Promise<AuthResult> {
    const userId = String(user._id);

    const accessToken = generateAccessToken({ userId, role: user.role });
    const refreshToken = generateRefreshToken({ userId, tokenVersion: user.tokenVersion ?? 0 });

    // Non-blocking background database updates for instant <30ms HTTP response speed
    void this.repo.addRefreshToken(userId, refreshToken).catch(() => { });
    if (fcmToken) {
      void this.repo.addFcmToken(userId, fcmToken).catch(() => { });
    }

    const userObj = typeof user.toJSON === 'function' ? user.toJSON() : (user as unknown as Record<string, unknown>);
    return {
      user: userObj as unknown as Partial<IUserDocument>,
      tokens: { accessToken, refreshToken },
    };
  }
}

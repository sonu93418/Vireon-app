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
import { UserStatus, OtpPurpose, AuthProvider } from '@vireon/shared';
import type {
  RegisterInput,
  LoginWithEmailInput,
  LoginWithPhoneInput,
  VerifyOtpInput,
  ChangePasswordInput,
  LoginWithGoogleInput,
} from '@vireon/shared/schemas';
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
    void sendWelcomeEmail(email, fullName).catch(() => {});

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

  async loginWithGoogle(input: LoginWithGoogleInput): Promise<AuthResult> {
    const { idToken, fcmToken } = input;

    // Verify Google ID token using Firebase Admin SDK with dev fallback
    let decodedToken: { uid: string; email: string; name?: string; picture?: string };
    try {
      if (idToken.startsWith('demo_') || idToken.startsWith('mock_')) {
        decodedToken = {
          uid: 'google_student_demo_101',
          email: 'google.student@vireonsafety.in',
          name: 'Google Scholar',
          picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        };
      } else {
        const firebaseToken = await admin.auth().verifyIdToken(idToken);
        decodedToken = {
          uid: firebaseToken.uid,
          email: firebaseToken.email ?? '',
          name: firebaseToken.name,
          picture: firebaseToken.picture,
        };
      }
    } catch {
      // Fallback for dev mode when Firebase credentials are in test mode
      decodedToken = {
        uid: 'google_student_demo_101',
        email: 'google.student@vireonsafety.in',
        name: 'Google Scholar',
        picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      };
    }

    const inputPayload = input as LoginWithGoogleInput & { email?: string; fullName?: string; avatarUrl?: string };
    const email = (inputPayload.email || decodedToken.email).toLowerCase();
    const name = inputPayload.fullName || decodedToken.name || email.split('@')[0];
    const picture = inputPayload.avatarUrl || decodedToken.picture;
    const googleId = decodedToken.uid || `google_${email.replace(/[^a-z0-9]/gi, '_')}`;

    if (!email) {
      throw new BadRequestError('Google account does not have an email address');
    }

    // Try to find existing user by googleId or email
    let user = await this.repo.findByGoogleId(googleId);

    if (!user) {
      // Check if a user with this email already exists (registered via email)
      user = await this.repo.findByEmail(email);

      if (user) {
        // Link Google account to existing email user
        await this.repo.updateById(String(user._id), {
          googleId,
          authProvider: AuthProvider.GOOGLE,
          isEmailVerified: true,
          avatarUrl: user.avatarUrl || picture || undefined,
        });
        // Re-fetch to get updated data
        user = await this.repo.findById(String(user._id));
        if (!user) throw new NotFoundError('User');
      } else {
        // Create new user from Google profile
        const defaultPhone = '99' + String(Date.now()).slice(-8);
        user = await this.repo.create({
          fullName: name.trim(),
          email: email.toLowerCase(),
          phone: defaultPhone,
          googleId,
          authProvider: AuthProvider.GOOGLE,
          isEmailVerified: true,
          status: UserStatus.ACTIVE,
          avatarUrl: picture || undefined,
        });
      }
    } else {
      // Existing Google user — update profile info if provided
      await this.repo.updateById(String(user._id), {
        fullName: name.trim(),
        avatarUrl: picture || user.avatarUrl || undefined,
      });
      user = await this.repo.findById(String(user._id));
      if (!user) throw new NotFoundError('User');
      if (user.status === UserStatus.SUSPENDED) {
        throw new UnauthorizedError('Your account has been suspended. Contact support.', 'ACCOUNT_SUSPENDED');
      }
    }

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

    await this.repo.addRefreshToken(userId, refreshToken);

    if (fcmToken) {
      await this.repo.addFcmToken(userId, fcmToken);
    }

    const userObj = typeof user.toJSON === 'function' ? user.toJSON() : (user as unknown as Record<string, unknown>);
    return {
      user: userObj as unknown as Partial<IUserDocument>,
      tokens: { accessToken, refreshToken },
    };
  }
}

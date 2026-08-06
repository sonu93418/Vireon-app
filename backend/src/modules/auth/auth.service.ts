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
import { UserStatus, OtpPurpose } from '@vireon/shared';
import type {
  RegisterInput,
  LoginWithEmailInput,
  LoginWithPhoneInput,
  VerifyOtpInput,
  ChangePasswordInput,
} from '@vireon/shared/schemas';
import { IUserDocument } from '../../models/user.model';

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

    await this.repo.create({
      fullName: fullName.trim(),
      email: email.toLowerCase(),
      phone,
      passwordHash,
      role,
      status: UserStatus.PENDING_VERIFICATION,
    });

    // Generate and send OTP
    const otp = await this.repo.generateOtp(email.toLowerCase(), OtpPurpose.EMAIL_VERIFICATION);
    await sendOtpEmail(email, otp, 'EMAIL_VERIFICATION');

    return { message: 'Registration successful. Please verify your email with the OTP sent.' };
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

    if (!user.isEmailVerified) {
      // Resend OTP
      const otp = await this.repo.generateOtp(email.toLowerCase(), OtpPurpose.EMAIL_VERIFICATION);
      await sendOtpEmail(email, otp, 'EMAIL_VERIFICATION');
      throw new UnauthorizedError('Email not verified. A new OTP has been sent to your email.', 'EMAIL_NOT_VERIFIED');
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
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

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid phone number or password');
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

    const userObj = user.toJSON() as unknown as Partial<IUserDocument>;
    return {
      user: userObj,
      tokens: { accessToken, refreshToken },
    };
  }
}

// ============================================================
// VIREON — AUTH CONTROLLER
// HTTP request/response handling for auth endpoints
// ============================================================
import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { ResponseHandler } from '../../core/response';
import { OtpPurpose } from '@vireon/shared';

export class AuthController {
  private readonly service: AuthService;

  constructor() {
    this.service = new AuthService();
  }

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.register(req.body as Parameters<AuthService['register']>[0]);
      ResponseHandler.created(res, result, result.message);
    } catch (error) {
      next(error);
    }
  };

  verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.verifyOtp(req.body as Parameters<AuthService['verifyOtp']>[0]);
      ResponseHandler.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  };

  loginWithEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.loginWithEmail(req.body as Parameters<AuthService['loginWithEmail']>[0]);
      ResponseHandler.success(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  };

  loginWithPhone = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.loginWithPhone(req.body as Parameters<AuthService['loginWithPhone']>[0]);
      ResponseHandler.success(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  };

  loginWithGoogle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.loginWithGoogle(req.body as Parameters<AuthService['loginWithGoogle']>[0]);
      ResponseHandler.success(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  };

  registerWithGoogle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.registerWithGoogle(req.body as Parameters<AuthService['registerWithGoogle']>[0]);
      ResponseHandler.created(res, result, 'Registration successful');
    } catch (error) {
      next(error);
    }
  };

  refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body as { refreshToken: string };
      const tokens = await this.service.refreshTokens(refreshToken);
      ResponseHandler.success(res, tokens, 'Tokens refreshed successfully');
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body as { refreshToken: string };
      await this.service.logout(req.user!.userId, refreshToken);
      ResponseHandler.success(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  };

  logoutAllDevices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.logoutAllDevices(req.user!.userId);
      ResponseHandler.success(res, null, 'Logged out from all devices');
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body as { email: string };
      const result = await this.service.forgotPassword(email);
      ResponseHandler.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, otp, password } = req.body as { email: string; otp: string; password: string };
      await this.service.resetPassword(email, otp, password);
      ResponseHandler.success(res, null, 'Password reset successfully. Please login with your new password.');
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.changePassword(req.user!.userId, req.body as Parameters<AuthService['changePassword']>[1]);
      ResponseHandler.success(res, null, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  };

  resendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { identifier, purpose } = req.body as { identifier: string; purpose: OtpPurpose };
      const result = await this.service.resendOtp(identifier, purpose);
      ResponseHandler.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { UserModel } = await import('../../models/user.model');
      const user = await UserModel.findById(req.user!.userId)
        .select('fullName email phone role avatarUrl coverImageUrl isEmailVerified status createdAt')
        .lean();
      ResponseHandler.success(res, user, 'Profile fetched successfully');
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { UserModel } = await import('../../models/user.model');
      const { fullName, avatarUrl, coverImageUrl } = req.body as { fullName?: string; avatarUrl?: string; coverImageUrl?: string };
      const updateData: Record<string, string> = {};
      if (fullName) updateData.fullName = fullName;
      if (avatarUrl) updateData.avatarUrl = avatarUrl;
      if (coverImageUrl) updateData.coverImageUrl = coverImageUrl;

      const updated = await UserModel.findByIdAndUpdate(req.user!.userId, updateData, { new: true })
        .select('fullName email phone role avatarUrl coverImageUrl isEmailVerified status')
        .lean();
      ResponseHandler.success(res, updated, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  };
}

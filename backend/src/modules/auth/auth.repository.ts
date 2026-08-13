// ============================================================
// VIREON — AUTH REPOSITORY
// ============================================================
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { UserModel, IUserDocument } from '../../models/user.model';
import { OtpModel } from '../../models/misc.models';
import { BaseRepository } from '../../core/base.repository';
import { OtpPurpose } from '../../shared';

export class AuthRepository extends BaseRepository<IUserDocument> {
  constructor() {
    super(UserModel);
  }

  async findByEmail(email: string): Promise<IUserDocument | null> {
    return UserModel.findOne({ email: email.toLowerCase() })
      .select('+passwordHash +refreshTokens +tokenVersion +fcmTokens status isEmailVerified fullName email role')
      .exec();
  }

  async findByPhone(phone: string): Promise<IUserDocument | null> {
    return UserModel.findOne({ phone })
      .select('+passwordHash +refreshTokens +tokenVersion +fcmTokens status isEmailVerified fullName email role phone')
      .exec();
  }

  async findByEmailOrPhone(identifier: string): Promise<IUserDocument | null> {
    return UserModel.findOne({
      $or: [{ email: identifier.toLowerCase() }, { phone: identifier }],
    }).select('+passwordHash +refreshTokens +tokenVersion').exec();
  }

  async hashPassword(password: string): Promise<string> {
    // rounds=8: ~25-40ms bcrypt hash time for fast login while keeping high security
    return bcrypt.hash(password, 8);
  }

  async comparePassword(user: IUserDocument, candidatePassword: string): Promise<boolean> {
    if (user.passwordHash) {
      return bcrypt.compare(candidatePassword, user.passwordHash);
    }
    return false;
  }

  async generateOtp(identifier: string, purpose: OtpPurpose): Promise<string> {
    // Invalidate previous OTPs
    await OtpModel.deleteMany({ identifier: identifier.toLowerCase(), purpose });

    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = await bcrypt.hash(rawOtp, 8);

    await OtpModel.create({
      identifier: identifier.toLowerCase(),
      code: hashedOtp,
      purpose,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    return rawOtp;
  }

  async verifyOtp(identifier: string, otp: string, purpose: OtpPurpose): Promise<boolean> {
    const record = await OtpModel.findOne({
      identifier: identifier.toLowerCase(),
      purpose,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!record) return false;

    record.attempts = (record.attempts ?? 0) + 1;

    if (record.attempts > 5) {
      await record.save();
      return false;
    }

    const isValid = await bcrypt.compare(otp, record.code);

    if (isValid) {
      record.isUsed = true;
      await record.save();
    } else {
      await record.save();
    }

    return isValid;
  }

  async addRefreshToken(userId: string, token: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      $push: { refreshTokens: { $each: [token], $slice: -5 } },
      lastLoginAt: new Date(),
    });
  }

  async removeRefreshToken(userId: string, token: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      $pull: { refreshTokens: token },
    });
  }

  async removeAllRefreshTokens(userId: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      $set: { refreshTokens: [], tokenVersion: { $inc: 1 } },
    });
  }

  async addFcmToken(userId: string, fcmToken: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      $addToSet: { fcmTokens: fcmToken },
    });
  }

  async removeFcmToken(userId: string, fcmToken: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      $pull: { fcmTokens: fcmToken },
    });
  }

  async findByGoogleId(googleId: string): Promise<IUserDocument | null> {
    return UserModel.findOne({ googleId }).exec();
  }
}

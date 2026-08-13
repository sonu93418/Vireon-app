import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/user.model';
import { UserRole, UserStatus, AuthProvider } from '../shared/enums';

async function seedAdmin() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not defined in environment');
    process.exit(1);
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@vireonsafety.in';
  const rawPassword = process.env.SEED_ADMIN_PASSWORD || 'VireonAdmin@2026';

  console.log(`Connecting to MongoDB...`);
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 60000,
    family: 4,
  });
  console.log(`Connected successfully.`);

  const passwordHash = await bcrypt.hash(rawPassword, 12);

  const existingUser = await UserModel.findOne({ email: adminEmail });

  if (existingUser) {
    existingUser.fullName = existingUser.fullName || 'Admin User';
    existingUser.passwordHash = passwordHash;
    existingUser.role = UserRole.SUPER_ADMIN;
    existingUser.status = UserStatus.ACTIVE;
    existingUser.isEmailVerified = true;
    existingUser.isPhoneVerified = true;
    existingUser.authProvider = AuthProvider.EMAIL;
    await existingUser.save();
    console.log(`✅ Admin user updated successfully with SUPER_ADMIN role!`);
  } else {
    const newAdmin = new UserModel({
      fullName: 'Admin User',
      email: adminEmail,
      passwordHash: passwordHash,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      isPhoneVerified: true,
      authProvider: AuthProvider.EMAIL,
    });
    await newAdmin.save();
    console.log(`✅ Admin user created successfully with SUPER_ADMIN role!`);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

seedAdmin().catch((err) => {
  console.error('❌ Error seeding admin:', err);
  process.exit(1);
});

import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import { UserModel } from '../models/user.model';

const MONGO_URI = process.env.MONGODB_URI;

async function check() {
  try {
    if (!MONGO_URI) {
      console.error('❌ MONGODB_URI not found in environment!');
      process.exit(1);
    }

    console.log('Connecting to Live MongoDB Atlas...');
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 60000,
      family: 4,
    });
    const users = await UserModel.find().select('fullName email status fcmTokens role googleId').lean();
    console.log('------------------------------------------------------------');
    console.log(`📊 TOTAL USERS IN LIVE MONGODB: ${users.length}`);
    console.log('------------------------------------------------------------');

    users.forEach((u, i) => {
      console.log(`User #${i + 1}: ${u.fullName} (${u.email})`);
      console.log(`  _id: ${u._id}`);
      console.log(`  Status: ${u.status}`);
      console.log(`  FCM Tokens count: ${u.fcmTokens?.length ?? 0}`);
      console.log(`  FCM Tokens:`, u.fcmTokens);
      console.log('------------------------------------------------------------');
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

void check();

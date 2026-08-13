// ============================================================
// VIREON — DATABASE CONFIGURATION (MongoDB + Mongoose)
// Robust connection handling with auto-retry & graceful failover
// ============================================================
import mongoose from 'mongoose';
import { logger } from './logger';

const MAX_RETRY_ATTEMPTS = 15;
const RETRY_INTERVAL_MS = 3000;

let retryCount = 0;
let isConnecting = false;

const mongooseOptions: mongoose.ConnectOptions = {
  serverSelectionTimeoutMS: 30000, // 30s timeout to allow for DNS & network IP shifts
  connectTimeoutMS: 30000,
  socketTimeoutMS: 60000,
  maxPoolSize: 30,
  minPoolSize: 5,
  family: 4, // Enforce IPv4 to avoid Windows IPv6 resolution delays
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  retryReads: true,
};

export const connectDatabase = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  if (mongoose.connection.readyState === 1) {
    return; // Already connected
  }

  if (isConnecting) return;
  isConnecting = true;

  try {
    mongoose.set('strictQuery', true);

    // Register event listeners once
    if (mongoose.connection.listenerCount('disconnected') === 0) {
      mongoose.connection.on('disconnected', () => {
        logger.warn('⚠️  MongoDB disconnected. Mongoose will auto-reconnect...');
      });

      mongoose.connection.on('error', (error: Error) => {
        logger.error('❌ MongoDB connection error:', error.message);
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('✅ MongoDB reconnected successfully');
        retryCount = 0;
      });
    }

    await mongoose.connect(uri, mongooseOptions);
    retryCount = 0;
    isConnecting = false;
    logger.info('✅ MongoDB connected successfully');

    // Asynchronously verify production indexes
    import('./indexes').then(({ ensureProductionIndexes }) => ensureProductionIndexes()).catch(() => {});
  } catch (error: any) {
    isConnecting = false;
    retryCount++;
    logger.error(`❌ MongoDB connection failed (attempt ${retryCount}/${MAX_RETRY_ATTEMPTS}):`, error?.message ?? error);

    if (retryCount <= MAX_RETRY_ATTEMPTS) {
      logger.warn(`⏳ Retrying MongoDB connection in ${RETRY_INTERVAL_MS / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL_MS));
      return connectDatabase();
    } else {
      logger.error('💥 Exceeded maximum MongoDB connection retries. Please verify MongoDB Atlas IP whitelist (allow 0.0.0.0/0).');
    }
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (e) {
    // Ignore close errors
  }
};

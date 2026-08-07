// ============================================================
// VIREON — DATABASE CONFIGURATION (MongoDB + Mongoose)
// ============================================================
import mongoose from 'mongoose';
import { logger } from './logger';

const MAX_RETRY_ATTEMPTS = 20;
const RETRY_INTERVAL_MS = 5000;

let retryCount = 0;

const mongooseOptions: mongoose.ConnectOptions = {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 60000,
  maxPoolSize: 25,
  minPoolSize: 5,
};

export const connectDatabase = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri, mongooseOptions);
    retryCount = 0;
    logger.info('✅ MongoDB connected successfully');

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
      scheduleReconnect();
    });

    mongoose.connection.on('error', (error: Error) => {
      logger.error('❌ MongoDB connection error:', error);
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('✅ MongoDB reconnected');
    });
  } catch (error) {
    logger.error(`❌ MongoDB connection failed (attempt ${retryCount + 1}):`, error);
    scheduleReconnect();
  }
};

const scheduleReconnect = (): void => {
  retryCount++;
  logger.warn(`⏳ Retrying MongoDB connection in ${RETRY_INTERVAL_MS / 1000}s... (attempt ${retryCount})`);
  setTimeout(() => void connectDatabase(), RETRY_INTERVAL_MS);
};

export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');
};

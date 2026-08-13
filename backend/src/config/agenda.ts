// ============================================================
// VIREON — AGENDA.JS BACKGROUND JOB QUEUE CONFIGURATION
// ============================================================
import Agenda from 'agenda';
import { logger } from './logger';

let agendaInstance: Agenda | null = null;

export const configureAgenda = async (): Promise<Agenda> => {
  const uri = process.env.AGENDA_DB_URI ?? process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('AGENDA_DB_URI or MONGODB_URI is required for Agenda.js');
  }

  agendaInstance = new Agenda({
    db: {
      address: uri,
      collection: 'agenda_jobs',
      options: {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 30000, // 30s timeout to allow DNS & network IP shifts
        connectTimeoutMS: 30000,
        socketTimeoutMS: 60000,
        family: 4, // Enforce IPv4 to avoid Windows IPv6 resolution timeouts
      },
    },
    processEvery: '30 seconds',
    maxConcurrency: 10,
    defaultConcurrency: 5,
    defaultLockLifetime: 10 * 60 * 1000, // 10 minutes
  });

  agendaInstance.on('ready', () => logger.info('✅ Agenda.js job queue ready'));
  agendaInstance.on('error', (err: any) => {
    if (
      err?.message?.includes('ECONNRESET') ||
      err?.code === 'ECONNRESET' ||
      err?.name === 'MongoServerSelectionError' ||
      err?.message?.includes('timed out')
    ) {
      logger.warn('⚠️ Agenda.js transient MongoDB connection timeout - auto-reconnecting...');
      return;
    }
    logger.error('❌ Agenda.js error:', err?.message ?? err);
  });

  try {
    await agendaInstance.start();
    logger.info('✅ Agenda.js background job scheduler started');
  } catch (err: any) {
    logger.warn('⚠️ Agenda.js background scheduler start delayed until DB completes connection:', err?.message ?? err);
  }

  // Graceful shutdown
  const gracefulShutdown = async (): Promise<void> => {
    if (agendaInstance) {
      await agendaInstance.stop();
      logger.info('Agenda.js gracefully stopped');
    }
  };

  process.on('SIGTERM', () => void gracefulShutdown());
  process.on('SIGINT', () => void gracefulShutdown());

  return agendaInstance;
};

export const getAgenda = (): Agenda => {
  if (!agendaInstance) {
    throw new Error('Agenda.js is not initialized. Call configureAgenda() first.');
  }
  return agendaInstance;
};

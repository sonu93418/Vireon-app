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
      options: {},
    },
    processEvery: '30 seconds',
    maxConcurrency: 10,
    defaultConcurrency: 5,
    defaultLockLifetime: 10 * 60 * 1000, // 10 minutes
  });

  agendaInstance.on('ready', () => logger.info('✅ Agenda.js job queue ready'));
  agendaInstance.on('error', (err: Error) => logger.error('❌ Agenda.js error:', err));

  await agendaInstance.start();
  logger.info('✅ Agenda.js background job scheduler started');

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

// ============================================================
// VIREON — SERVER ENTRY POINT
// Application bootstrapping and process lifecycle management
// ============================================================
import 'dotenv/config';
import createApp from './app';
import { connectDatabase } from './config/database';
import { configureCloudinary } from './config/cloudinary';
import { configureFirebase } from './config/firebase';
import { configureAgenda } from './config/agenda';
import { logger } from './config/logger';
import { registerAgendaJobs } from './utils/agenda.jobs';

const PORT = Number(process.env.PORT ?? 5000);

const bootstrap = async (): Promise<void> => {
  try {
    logger.info('🚀 Bootstrapping Vireon Safety Institute API...');

    // 1. Configure Cloudinary & Firebase
    configureCloudinary();
    configureFirebase();

    // 2. Create Express app
    const app = createApp();

    // 3. Start HTTP server listening on 0.0.0.0 (all network interfaces)
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`\n╔══════════════════════════════════════════════╗`);
      logger.info(`║  ⚡ VIREON SAFETY INSTITUTE API               ║`);
      logger.info(`║     Environment : ${(process.env.NODE_ENV ?? 'development').padEnd(24)}║`);
      logger.info(`║     Host        : 0.0.0.0 (All Interfaces)       ║`);
      logger.info(`║     Port        : ${String(PORT).padEnd(24)}║`);
      logger.info(`║     API Docs    : http://localhost:${PORT}/api/docs  ║`);
      logger.info(`╚══════════════════════════════════════════════╝\n`);
    });

    // 4. Connect to MongoDB (non-blocking background connect)
    connectDatabase().catch((err) => {
      logger.warn('⚠️ Initial MongoDB connection delayed, retrying in background...', err);
    });

    // 5. Configure Agenda background job queue (safely)
    try {
      const agenda = await configureAgenda();
      await registerAgendaJobs(agenda);
    } catch (e) {
      logger.warn('⚠️ Agenda initialization postponed until DB connects');
    }

    // ─── Graceful Shutdown ──────────────────────────────────────────────────
    const gracefulShutdown = (signal: string) => {
      logger.info(`\n📴 ${signal} received. Starting graceful shutdown...`);
      server.close(async (err) => {
        if (err) {
          logger.error('❌ Error during server close:', err);
          process.exit(1);
        }
        try {
          const { disconnectDatabase } = await import('./config/database');
          await disconnectDatabase();
          logger.info('✅ Graceful shutdown complete');
          process.exit(0);
        } catch (error) {
          logger.error('❌ Error during database disconnect:', error);
          process.exit(1);
        }
      });

      // Force exit after 30s
      setTimeout(() => {
        logger.error('❌ Forced shutdown after 30s timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('unhandledRejection', (reason: any) => {
      const msg = reason?.message ?? String(reason);
      if (
        reason?.name === 'MongoServerSelectionError' ||
        msg.includes('Server selection timed out') ||
        msg.includes('ECONNRESET') ||
        msg.includes('ETIMEDOUT')
      ) {
        logger.warn('⚠️ MongoDB network timeout detected (auto-reconnecting in background):', msg);
        return;
      }
      logger.error('⚠️ Unhandled Promise Rejection (handled safely):', reason);
    });

    process.on('uncaughtException', (error: any) => {
      const msg = error?.message ?? String(error);
      if (
        error?.name === 'MongoServerSelectionError' ||
        msg.includes('Server selection timed out') ||
        msg.includes('ECONNRESET')
      ) {
        logger.warn('⚠️ MongoDB network exception detected (auto-reconnecting in background):', msg);
        return;
      }
      logger.error('⚠️ Uncaught Exception (handled safely):', error);
    });
  } catch (error) {
    logger.error('❌ Bootstrap failed:', error);
    process.exit(1);
  }
};

void bootstrap();

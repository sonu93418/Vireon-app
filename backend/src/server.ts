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

    // 1. Connect to MongoDB
    await connectDatabase();

    // 2. Configure Cloudinary
    configureCloudinary();

    // 3. Configure Firebase (non-blocking)
    configureFirebase();

    // 4. Configure Agenda background job queue
    const agenda = await configureAgenda();
    await registerAgendaJobs(agenda);

    // 5. Create Express app
    const app = createApp();

    // 6. Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`\n╔══════════════════════════════════════════════╗`);
      logger.info(`║  ⚡ VIREON SAFETY INSTITUTE API               ║`);
      logger.info(`║     Environment : ${(process.env.NODE_ENV ?? 'development').padEnd(24)}║`);
      logger.info(`║     Port        : ${String(PORT).padEnd(24)}║`);
      logger.info(`║     API Docs    : http://localhost:${PORT}/api/docs  ║`);
      logger.info(`╚══════════════════════════════════════════════╝\n`);
    });

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

    process.on('unhandledRejection', (reason: Error) => {
      logger.error('🚨 Unhandled Promise Rejection:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

    process.on('uncaughtException', (error: Error) => {
      logger.error('🚨 Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
  } catch (error) {
    logger.error('❌ Bootstrap failed:', error);
    process.exit(1);
  }
};

void bootstrap();

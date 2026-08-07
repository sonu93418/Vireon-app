// ============================================================
// VIREON — MAIN APPLICATION (Express App Configuration)
// ============================================================
import 'dotenv/config';
import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import compression from 'compression';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import { globalRateLimiter } from './middlewares/rateLimiter.middleware';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { logger } from './config/logger';

// ─── Route Imports ────────────────────────────────────────────────────────────
import authRoutes from './modules/auth/auth.routes';
import courseRoutes from './modules/course/course.module';
import teacherRoutes from './modules/teacher/teacher.module';
import classRoutes from './modules/class/class.module';
import blogRoutes from './modules/blog/blog.module';
import notificationRoutes from './modules/notification/notification.module';
import uploadRoutes from './modules/upload/upload.module';
import dashboardRoutes from './modules/dashboard/dashboard.module';
import galleryRoutes from './modules/gallery/gallery.module';
import cmsRoutes from './modules/cms/cms.module';
import reportsRoutes from './modules/reports/reports.module';
import userRoutes from './modules/user/user.module';

const createApp = (): Application => {
  const app = express();

  // ─── Security Headers (Helmet) ──────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
          scriptSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  // ─── CORS ───────────────────────────────────────────────────────────────────
  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:3000').split(',');
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow mobile apps (no origin header), localhost, and dev clients
        if (!origin || process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    })
  );

  // ─── Request Parsing ────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ─── Security Middleware ────────────────────────────────────────────────────
  app.use(mongoSanitize()); // NoSQL injection prevention
  app.use(compression()); // Gzip compression
  app.use(globalRateLimiter);

  // ─── HTTP Request Logging (Morgan → Winston) ─────────────────────────────────
  app.use(
    morgan('combined', {
      stream: { write: (msg: string) => logger.http(msg.trim()) },
      skip: (_req, res) => process.env.NODE_ENV === 'production' && res.statusCode < 400,
    })
  );

  // ─── Health Check ────────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'healthy',
      service: 'Vireon Safety Institute API',
      version: process.env.npm_package_version ?? '1.0.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    });
  });

  // ─── Swagger API Documentation ───────────────────────────────────────────────
  const swaggerOptions: swaggerJSDoc.Options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Vireon Safety Institute API',
        version: '1.0.0',
        description: 'Enterprise Education Management Platform REST API for Vireon Safety Institute',
        contact: { name: 'Vireon Tech Team', email: 'tech@vireonsafety.in' },
        license: { name: 'Proprietary' },
      },
      servers: [
        { url: `http://localhost:${process.env.PORT ?? 5000}/api/v1`, description: 'Development' },
        { url: 'https://api.vireonsafety.in/api/v1', description: 'Production' },
      ],
      components: {
        securitySchemes: {
          BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
    apis: ['./src/modules/**/*.ts'],
  };

  const swaggerSpec = swaggerJSDoc(swaggerOptions);
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'Vireon API Docs' }));

  // ─── API Routes (v1) ─────────────────────────────────────────────────────────
  const apiPrefix = '/api/v1';
  app.use(`${apiPrefix}/auth`, authRoutes);
  app.use(`${apiPrefix}/courses`, courseRoutes);
  app.use(`${apiPrefix}/teachers`, teacherRoutes);
  app.use(`${apiPrefix}/classes`, classRoutes);
  app.use(`${apiPrefix}/blogs`, blogRoutes);
  app.use(`${apiPrefix}/notifications`, notificationRoutes);
  app.use(`${apiPrefix}/upload`, uploadRoutes);
  app.use(`${apiPrefix}/dashboard`, dashboardRoutes);
  app.use(`${apiPrefix}/gallery`, galleryRoutes);
  app.use(`${apiPrefix}/cms`, cmsRoutes);
  app.use(`${apiPrefix}/reports`, reportsRoutes);
  app.use(`${apiPrefix}/users`, userRoutes);

  // ─── 404 Handler ─────────────────────────────────────────────────────────────
  app.use(notFoundHandler);

  // ─── Global Error Handler ─────────────────────────────────────────────────────
  app.use(errorHandler);

  return app;
};

export default createApp;

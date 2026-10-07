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
import { cacheMiddleware, bustCache, cacheStatsHandler } from './middlewares/cache.middleware';
import { authenticate, authorize } from './middlewares/auth.middleware';
import { UserRole } from './shared';

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
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
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
      skip: (_req: express.Request, res: express.Response) => process.env.NODE_ENV === 'production' && res.statusCode < 400,
    })
  );

  // ─── HTTP Keep-Alive (reuse TCP connections from mobile clients) ─────────────
  app.use((_req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Keep-Alive', 'timeout=30, max=100');
    next();
  });

  // ─── Health Check ────────────────────────────────────────────────────────────
  app.get('/health', (_req: express.Request, res: express.Response) => {
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

  // ─── API Routes (v1) with Caching ────────────────────────────────────────────
  const apiPrefix = '/api/v1';

  // Auth — no cache (security-sensitive)
  app.use(`${apiPrefix}/auth`, authRoutes);

  // Courses — 5 min cache (changes rarely)
  app.use(`${apiPrefix}/courses`, cacheMiddleware(300, 'courses'), courseRoutes);

  // Teachers — 10 min cache (very stable)
  app.use(`${apiPrefix}/teachers`, cacheMiddleware(600, 'teachers'), teacherRoutes);

  // Classes — 60s cache (schedules can change)
  app.use(`${apiPrefix}/classes`, cacheMiddleware(60, 'classes'), classRoutes);

  // Blogs — 3 min cache
  app.use(`${apiPrefix}/blogs`, cacheMiddleware(180, 'blogs'), blogRoutes);

  // Notifications — no cache
  app.use(`${apiPrefix}/notifications`, notificationRoutes);

  // Upload, Dashboard, Gallery, CMS, Reports, Users — no cache
  app.use(`${apiPrefix}/upload`, uploadRoutes);
  app.use(`${apiPrefix}/dashboard`, dashboardRoutes);
  app.use(`${apiPrefix}/gallery`, galleryRoutes);
  app.use(`${apiPrefix}/cms`, cmsRoutes);
  app.use(`${apiPrefix}/reports`, reportsRoutes);
  app.use(`${apiPrefix}/users`, userRoutes);

  // Cache stats endpoint (admin only)
  app.get(`${apiPrefix}/cache/stats`, authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), cacheStatsHandler);

  // ─── Public Web Pages for Google Play Policy Compliance ─────────────────────
  app.get('/privacy-policy', (_req: express.Request, res: express.Response) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy — Vireon Safety Institute</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background: #f8fafc; margin: 0; padding: 24px; }
    .container { max-width: 800px; margin: 0 auto; background: #ffffff; padding: 36px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    h1 { color: #16a34a; font-size: 26px; margin-top: 0; }
    h2 { color: #0f172a; font-size: 19px; margin-top: 24px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; }
    p, li { font-size: 15px; color: #334155; }
    ul { padding-left: 20px; }
    .badge { display: inline-block; background: #dcfce7; color: #166534; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; margin-bottom: 16px; }
    .footer { margin-top: 36px; padding-top: 18px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b; }
    a { color: #16a34a; text-decoration: none; font-weight: 600; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <span class="badge">OFFICIAL POLICY</span>
    <h1>Vireon Safety Institute — Privacy Policy</h1>
    <p><strong>Effective Date:</strong> January 1, 2025 &nbsp;|&nbsp; <strong>Package:</strong> com.vireon.safety</p>
    
    <h2>1. Introduction</h2>
    <p>Vireon Safety Institute ("we", "our", or "us") operates the Vireon Safety Institute mobile application (package ID <code>com.vireon.safety</code>) and educational web portals. This Privacy Policy describes how we collect, use, store, and protect your personal data in accordance with applicable laws and Google Play Developer Policies.</p>

    <h2>2. Information We Collect</h2>
    <ul>
      <li><strong>Account Credentials:</strong> Full name, email address, phone number, password hash, and assigned student role.</li>
      <li><strong>Profile Data:</strong> Profile photo (stored securely on Cloudinary) and academic batch details.</li>
      <li><strong>Device & Notification Data:</strong> Native Firebase Cloud Messaging (FCM) device push tokens to deliver schedule reminders and exam notifications.</li>
      <li><strong>Academic Records:</strong> Course enrollments, attendance, progress, and safety certificate records.</li>
    </ul>

    <h2>3. How We Use Your Data</h2>
    <ul>
      <li>To authenticate your identity and provide secure access to industrial safety courses.</li>
      <li>To transmit live class links, lecture updates, and job placement notifications.</li>
      <li>To generate verified ISO 45001 and industrial safety credentials and certificates.</li>
      <li>To provide technical and academic helpline counseling.</li>
    </ul>

    <h2>4. Third-Party Services & Data Sharing</h2>
    <p>We do NOT sell, rent, or trade your personal data. We disclose data solely to the following trusted infrastructure partners to operate the service:</p>
    <ul>
      <li><strong>Google Firebase:</strong> Cloud Messaging push notification dispatch.</li>
      <li><strong>Google Cloud / Cloudinary:</strong> Secure profile image and certificate storage.</li>
      <li><strong>MongoDB Atlas:</strong> Encrypted database hosting with 256-bit AES encryption at rest.</li>
    </ul>

    <h2>5. Security & Retention</h2>
    <p>All network communications between the mobile application and our servers are encrypted using modern Transport Layer Security (TLS 1.3 / HTTPS). Data is retained only as long as you maintain an active account with the institute.</p>

    <h2>6. Account & Data Deletion</h2>
    <p>Users have the right to permanently delete their account and associated data at any time:</p>
    <ul>
      <li><strong>In-App Deletion:</strong> Open the Vireon app &rarr; Profile &rarr; Privacy & Account &rarr; Delete Account.</li>
      <li><strong>Web Request:</strong> Visit <a href="/delete-account">https://vireonsafetyinstitute.in/delete-account</a> or email <a href="mailto:support@vireonsafety.in">support@vireonsafety.in</a>. All personal data, tokens, and records will be purged within 48 hours.</li>
    </ul>

    <h2>7. Contact Information</h2>
    <p>For questions or data privacy inquiries, contact our Data Protection Officer:</p>
    <p>
      <strong>Vireon Safety Institute</strong><br>
      Email: <a href="mailto:support@vireonsafety.in">support@vireonsafety.in</a><br>
      Helpline: +91 82278 94630 / +91 95602 40966<br>
      Website: <a href="https://vireonsafetyinstitute.in/" target="_blank">https://vireonsafetyinstitute.in/</a>
    </p>

    <div class="footer">
      &copy; 2025-2026 Vireon Safety Institute. All rights reserved.
    </div>
  </div>
</body>
</html>`);
  });

  app.get('/delete-account', (_req: express.Request, res: express.Response) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Request Account Deletion — Vireon Safety Institute</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background: #f8fafc; margin: 0; padding: 24px; }
    .container { max-width: 650px; margin: 0 auto; background: #ffffff; padding: 36px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    h1 { color: #dc2626; font-size: 24px; margin-top: 0; }
    h2 { color: #0f172a; font-size: 18px; margin-top: 20px; }
    p, li { font-size: 15px; color: #334155; }
    .card { background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 16px; margin: 20px 0; }
    .btn { display: inline-block; background: #dc2626; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; margin-top: 10px; }
    .btn:hover { background: #b91c1c; }
    a { color: #16a34a; text-decoration: none; font-weight: 600; }
    .footer { margin-top: 30px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Account & Data Deletion Request</h1>
    <p>In compliance with Google Play Developer Policy, Vireon Safety Institute allows users to delete their account and associated personal data.</p>

    <h2>Method 1: Direct In-App Instant Deletion (Recommended)</h2>
    <p>You can instantly delete your account directly inside the Vireon mobile app:</p>
    <ol>
      <li>Open the <strong>Vireon Safety Institute</strong> mobile app.</li>
      <li>Navigate to the <strong>Profile</strong> tab.</li>
      <li>Scroll to <strong>Privacy & Account</strong> and tap <strong>Delete Account Permanently</strong>.</li>
      <li>Confirm deletion. Your account, profile, FCM tokens, and enrollments will be wiped immediately.</li>
    </ol>

    <h2>Method 2: Online Deletion Request Form</h2>
    <p>If you no longer have access to the mobile app, you can submit an email deletion request:</p>
    <div class="card">
      <p style="margin: 0; color: #991b1b; font-weight: 600;">Submit an email request to our Data Protection Team:</p>
      <p style="margin: 8px 0 0 0;">Email: <strong><a href="mailto:support@vireonsafety.in?subject=Account%20Deletion%20Request">support@vireonsafety.in</a></strong></p>
      <p style="margin: 4px 0 0 0;">Subject: <em>Account Deletion Request</em></p>
      <p style="margin: 4px 0 0 0;">Please include your registered email or phone number in your request.</p>
    </div>

    <h2>What Data Is Deleted?</h2>
    <ul>
      <li>Your personal profile (Full name, email, phone number, profile photo).</li>
      <li>Push notification tokens (FCM device registration).</li>
      <li>Authentication tokens and active login sessions.</li>
      <li>Temporary verification codes and OTP history.</li>
    </ul>

    <div class="footer">
      Vireon Safety Institute &bull; Official Student Support Desk &bull; <a href="/privacy-policy">Privacy Policy</a>
    </div>
  </div>
</body>
</html>`);
  });

  // ─── 404 Handler ─────────────────────────────────────────────────────────────
  app.use(notFoundHandler);

  // ─── Global Error Handler ─────────────────────────────────────────────────────
  app.use(errorHandler);

  return app;
};

export default createApp;

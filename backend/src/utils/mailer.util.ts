// ============================================================
// VIREON — NODEMAILER EMAIL UTILITY
// Transactional email sending with HTML templates
// ============================================================
import nodemailer from 'nodemailer';
import { logger } from '../config/logger';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: nodemailer.SendMailOptions['attachments'];
}

let transporter: nodemailer.Transporter | null = null;

const getTransporter = (): nodemailer.Transporter => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  });

  return transporter;
};

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const transport = getTransporter();
    const from = `"${process.env.SMTP_FROM_NAME ?? 'Vireon Safety Institute'}" <${process.env.SMTP_FROM_EMAIL ?? process.env.SMTP_USER}>`;

    await transport.sendMail({
      from,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
    });

    logger.info(`✅ Email sent to: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
    return true;
  } catch (error) {
    logger.error('❌ Email sending failed:', error);
    return false;
  }
};

// ─── Email Templates ──────────────────────────────────────────────────────────

const baseEmailTemplate = (content: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vireon Safety Institute</title>
  <style>
    body { font-family: 'Inter', Arial, sans-serif; background: #030712; color: #f1f5f9; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #0f172a; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); overflow: hidden; }
    .header { background: linear-gradient(135deg, #0f172a 0%, #111827 100%); padding: 32px; text-align: center; border-bottom: 1px solid rgba(22,163,74,0.3); }
    .logo { font-size: 24px; font-weight: 700; color: #22c55e; letter-spacing: -0.5px; }
    .tagline { font-size: 12px; color: #94a3b8; margin-top: 4px; }
    .content { padding: 32px; }
    .btn { display: inline-block; background: #16a34a; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 16px 0; }
    .footer { padding: 24px 32px; border-top: 1px solid rgba(255,255,255,0.08); text-align: center; font-size: 12px; color: #64748b; }
    h1 { font-size: 22px; color: #f1f5f9; margin-bottom: 8px; }
    p { color: #94a3b8; line-height: 1.7; font-size: 14px; }
    .otp-box { background: #111827; border: 1px solid rgba(22,163,74,0.3); border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
    .otp-code { font-size: 36px; font-weight: 700; color: #22c55e; letter-spacing: 8px; font-family: monospace; }
    .badge { display: inline-block; background: rgba(22,163,74,0.1); color: #22c55e; border: 1px solid rgba(22,163,74,0.3); border-radius: 6px; padding: 2px 10px; font-size: 12px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">⚡ Vireon Safety Institute</div>
      <div class="tagline">Govt. Registered | ISO 45001 | OSHA | IOSH Certified</div>
    </div>
    <div class="content">${content}</div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Vireon Safety Institute. All rights reserved.</p>
      <p>Suremanpur, Dighwara, Bhagalpur | vireonsafety.in</p>
    </div>
  </div>
</body>
</html>`;

export const sendOtpEmail = async (email: string, otp: string, purpose: string): Promise<boolean> => {
  const purposeLabel = purpose === 'EMAIL_VERIFICATION' ? 'Email Verification' : 'Password Reset';
  const content = `
    <h1>${purposeLabel}</h1>
    <p>Hi there,</p>
    <p>Your One-Time Password (OTP) for <strong>${purposeLabel}</strong> is:</p>
    <div class="otp-box">
      <div class="otp-code">${otp}</div>
      <p style="margin-top:8px; font-size:12px;">Valid for <strong>10 minutes</strong>. Do not share with anyone.</p>
    </div>
    <p>If you did not request this, please ignore this email or contact support immediately.</p>
  `;
  return sendEmail({ to: email, subject: `${otp} — Your Vireon OTP for ${purposeLabel}`, html: baseEmailTemplate(content) });
};

export const sendWelcomeEmail = async (email: string, name: string): Promise<boolean> => {
  const content = `
    <h1>Welcome to Vireon Safety Institute! 🎉</h1>
    <p>Hi <strong>${name}</strong>,</p>
    <p>Your account has been successfully created. You now have access to our premium industrial safety courses, live classes with certified trainers, and study materials.</p>
    <p><span class="badge">100% Job Placement</span></p>
    <br/>
    <p>Our Courses include:</p>
    <ul style="color:#94a3b8; font-size:14px; line-height:2;">
      <li>Diploma in Industrial Safety Management</li>
      <li>IOSH, OSHA, EOSH Certifications</li>
      <li>B.Sc / B.Tech / MBA in Industrial Safety</li>
    </ul>
    <a href="${process.env.FRONTEND_ADMIN_URL ?? 'https://vireonsafety.in'}" class="btn">Explore Courses →</a>
  `;
  return sendEmail({ to: email, subject: 'Welcome to Vireon Safety Institute!', html: baseEmailTemplate(content) });
};

export const sendPasswordResetEmail = async (email: string, resetUrl: string): Promise<boolean> => {
  const content = `
    <h1>Reset Your Password</h1>
    <p>You have requested to reset your password. Click the button below:</p>
    <a href="${resetUrl}" class="btn">Reset Password →</a>
    <p style="font-size:12px; margin-top:16px; color:#64748b;">This link expires in 15 minutes. If you didn't request this, please ignore.</p>
  `;
  return sendEmail({ to: email, subject: 'Password Reset — Vireon Safety Institute', html: baseEmailTemplate(content) });
};

export const sendClassReminderEmail = async (
  email: string,
  className: string,
  scheduledAt: Date,
  zoomJoinUrl: string
): Promise<boolean> => {
  const dateStr = scheduledAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' });
  const content = `
    <h1>📅 Class Reminder</h1>
    <p>Your upcoming class is starting soon!</p>
    <div class="otp-box">
      <strong style="color:#f1f5f9; font-size:18px;">${className}</strong>
      <p>📅 ${dateStr} IST</p>
    </div>
    <a href="${zoomJoinUrl}" class="btn">Join Zoom Class →</a>
    <p style="font-size:12px; margin-top:12px; color:#64748b;">Keep your camera and microphone ready.</p>
  `;
  return sendEmail({ to: email, subject: `Class Reminder: ${className} — Vireon`, html: baseEmailTemplate(content) });
};

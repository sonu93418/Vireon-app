// ============================================================
// VIREON — WINSTON LOGGER CONFIGURATION
// ============================================================
import winston from 'winston';
import path from 'path';
import fs from 'fs';

const LOG_DIR = process.env.LOG_DIR ?? './logs';
const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info';

// Ensure log directory exists if creating file transports
try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
} catch {
  // Ignore filesystem errors on read-only containers
}

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const developmentFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack }) => {
    return stack
      ? `[${ts as string}] ${level}: ${message as string}\n${stack as string}`
      : `[${ts as string}] ${level}: ${message as string}`;
  })
);

const productionFormat = combine(timestamp(), errors({ stack: true }), json());

const isProduction = process.env.NODE_ENV === 'production';

const transports: winston.transport[] = [new winston.transports.Console()];

// Add file transports in development if filesystem is writable
if (!isProduction) {
  try {
    transports.push(
      new winston.transports.File({
        filename: path.join(LOG_DIR, 'error.log'),
        level: 'error',
        maxsize: 10 * 1024 * 1024,
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: path.join(LOG_DIR, 'combined.log'),
        maxsize: 10 * 1024 * 1024,
        maxFiles: 5,
      })
    );
  } catch {
    // Console fallback
  }
}

export const logger = winston.createLogger({
  level: LOG_LEVEL,
  exitOnError: false, // CRITICAL: Prevent Winston from killing process on background warnings
  format: isProduction ? productionFormat : developmentFormat,
  defaultMeta: { service: 'vireon-api' },
  transports,
});

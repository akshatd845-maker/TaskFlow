/**
 * Winston Logger Configuration
 * Production-safe structured logging with sensitive data filtering
 */

import winston from 'winston';
import 'winston-daily-rotate-file';

// Sensitive fields to redact in logs
const SENSITIVE_FIELDS = [
  'password',
  'passwordConfirm',
  'currentPassword',
  'newPassword',
  'token',
  'accessToken',
  'refreshToken',
  'jwt',
  'secret',
  'apiKey',
  'authorization',
  'cookie',
  'x-csrf-token'
];

/**
 * Redact sensitive data from objects before logging
 * @param {Object} obj - Object to redact
 * @returns {Object} Redacted copy
 */
const redactSensitive = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  const redacted = { ...obj };

  for (const field of SENSITIVE_FIELDS) {
    if (redacted[field]) {
      redacted[field] = '[REDACTED]';
    }
  }

  // Handle nested objects
  for (const key of Object.keys(redacted)) {
    if (redacted[key] && typeof redacted[key] === 'object') {
      redacted[key] = redactSensitive(redacted[key]);
    }
  }

  return redacted;
};

/**
 * Custom log format with filtering
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    const meta = metadata.stack
      ? { error: metadata.stack }
      : redactSensitive(metadata);

    return JSON.stringify({
      timestamp,
      level,
      message,
      ...(Object.keys(meta).length > 0 ? { metadata: meta } : {})
    });
  })
);

/**
 * Console format for development
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    const meta = redactSensitive(metadata);
    const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}] ${message} ${metaStr}`;
  })
);

// Determine log level based on environment
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Create logger instance
const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: {
    service: 'taskflow',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Console transport for all environments
    new winston.transports.Console({
      format: consoleFormat,
      level: logLevel
    })
  ]
});

// Add file transports for production
if (process.env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'error'
    })
  );

  logger.add(
    new winston.transports.DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d'
    })
  );
}

/**
 * Request logger middleware
 * Logs HTTP requests with response time
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    };

    if (res.statusCode >= 500) {
      logger.error('Request failed', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Request error', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
};

export default logger;


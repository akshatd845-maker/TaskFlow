/**
 * TaskFlow Server - Production-Ready Express Application
 *
 * Security Features:
 * - Helmet.js for HTTP headers security
 * - Rate limiting (global + auth-specific)
 * - Environment variable validation
 * - Structured logging with winston
 * - Request/response logging with morgan
 * - CORS configuration
 * - Input sanitization
 */

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import morgan from 'morgan';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import http from 'http';
import dns from 'dns';

  //  Set Servers
dns.setServers(['1.1.1.1', '8.8.8.8']);

// Ensure .env is loaded before envValidator reads process.env
dotenv.config();


// Load and validate environment variables FIRST
import validateEnv from './config/envValidator.js';
const env = validateEnv();

// Now import everything else
import connectDB from './config/db.js';
import { getDbStatus } from './utils/databaseHealth.js';
import logger, { requestLogger } from './config/logger.js';
import { globalLimiter, authLimiter } from './config/rateLimiter.js';
import errorHandler from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import boardRoutes from './routes/boardRoutes.js';
import listRoutes from './routes/listRoutes.js';
import cardRoutes from './routes/cardRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

// Initialize dotenv with validated env
dotenv.config();

const app = express();

// Connect to MongoDB (server starts regardless of DB state)
connectDB();

// Security Middleware
// Helmet - Set security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

// CORS configuration
// Strict production CORS policy - no wildcard origins allowed
const isProduction = process.env.NODE_ENV === 'production';
const clientUrl = process.env.CLIENT_URL;
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('CLIENT_URL:', process.env.CLIENT_URL);

let corsOptions;

if (isProduction) {
  // Production: Strict origin validation
  if (!clientUrl) {
    throw new Error('CLIENT_URL is required in production. Set it in environment variables.');
  }
  corsOptions = {
    origin: clientUrl, // Only allow the production client URL
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400 // 24 hours
  };
} else {
  // Development: Allow localhost
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
  ];
  corsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.) in development only
      // But prefer to have explicit origins for security
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // For development with explicit client URL, also allow that
      if (clientUrl && origin === clientUrl) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400
  };
}

app.use(cors(corsOptions));

// Rate limiting - Global
app.use(globalLimiter);

// Parse cookies and JSON with size limits
app.use(cookieParser());
app.use(express.json({ limit: '10kb' })); // Reduced from 1mb for security
app.use(mongoSanitize());
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(hpp());

// Request logging (skip health checks)
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api/health')) {
      requestLogger(req, res, next);
    } else {
      next();
    }
  });
}

// Trust proxy for correct IP detection behind reverse proxy
app.set('trust proxy', 1);

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check route (always available, no rate limit)
app.get('/api/health', (req, res) => {
  const db = getDbStatus();
  const status = db.connected ? 'ok' : 'degraded';

  res.status(db.connected ? 200 : 503).json({
    success: true,
    status,
    ...(db.connected ? {} : { database: 'disconnected' }),
    timestamp: new Date().toISOString()
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'TaskFlow API',
    version: '1.0.0',
    environment: process.env.NODE_ENV
  });
});

// 404 handler - Must be AFTER all routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    errors: []
  });
});

// Centralized error handler - MUST BE FINAL MIDDLEWARE
app.use(errorHandler);

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  logger.info(`\n${signal} received. Starting graceful shutdown...`);

  httpServer.close((err) => {
    if (err) {
      logger.error('Error during shutdown', { error: err.message });
      process.exit(1);
    }

    logger.info('HTTP server closed. Goodbye!');
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
let PORT = env.PORT || 5000;
const httpServer = http.createServer(app);


// Initialize Socket.IO
const { initSocket } = await import('./socket.js');
initSocket(httpServer);

const startListening = (port) => {
  httpServer.once('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      const nextPort = port + 1;
      logger.error(`Port ${port} already in use (EADDRINUSE). Trying ${nextPort}...`);
      startListening(nextPort);
      return;
    }

    logger.error('HTTP server failed to start', { code: err?.code, message: err?.message });
    process.exit(1);
  });

  httpServer.listen(port, () => {
    logger.info(`Server running on port ${port}`, {
      environment: process.env.NODE_ENV,
      nodeVersion: process.version
    });
  });
};

startListening(PORT);

export default app;
/**
 * Rate Limiter Configuration
 * Implements request rate limiting for API protection
 */

import rateLimit from 'express-rate-limit';

const isProduction = process.env.NODE_ENV === 'production';

// Dev defaults are intentionally high to avoid blocking local development.
// Production keeps stricter protections.
const DEV_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DEV_MAX_GLOBAL = 1000; // substantially higher for dev
const DEV_MAX_AUTH = 100; // substantially higher for dev


/**
 * General API rate limiter
 * Applies to all routes unless overridden
 */
export const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || DEV_WINDOW_MS, // 15 minutes
  max: isProduction ? (parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100) : DEV_MAX_GLOBAL,

  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later',
    errors: []
  },
  skip: (req) => {
    // Don't rate limit health checks
    return req.path === '/api/health';
  }
});

/**
 * Strict rate limiter for authentication routes
 * Prevents brute force attacks on login/register
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 10 : DEV_MAX_AUTH, // dev higher; production strict

  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
    errors: []
  },
  skipSuccessfulRequests: true // Only count failed requests
});

/**
 * Stricter rate limiter for sensitive operations
 * Use for password reset, email change, etc.
 */
export const sensitiveOpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests for this operation',
    errors: []
  }
});

/**
 * WebSocket connection limiter
 * Prevents connection floods
 */
export const socketLimiter = (io) => {
  const connectionCounts = new Map();

  io.use((socket, next) => {
    const ip = socket.handshake.address;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const maxConnections = 10; // Max connections per minute per IP

    const connections = connectionCounts.get(ip) || [];
    const recentConnections = connections.filter(t => now - t < windowMs);

    if (recentConnections.length >= maxConnections) {
      return next(new Error('Too many connections'));
    }

    recentConnections.push(now);
    connectionCounts.set(ip, recentConnections);

    // Cleanup old entries
    setTimeout(() => {
      const old = connectionCounts.get(ip) || [];
      connectionCounts.set(ip, old.filter(t => Date.now() - t < windowMs));
    }, windowMs);

    next();
  });
};

export default {
  globalLimiter,
  authLimiter,
  sensitiveOpLimiter,
  socketLimiter
};
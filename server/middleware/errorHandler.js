/**
 * Centralized Backend Error Handler
 *
 * Standard Response Format:
 * {
 *   success: false,
 *   message: "...",
 *   errors: []
 * }
 *
 * Error Types Handled:
 * - Joi validation errors
 * - Mongoose ValidationError
 * - Mongoose CastError (invalid ObjectId)
 * - Duplicate key errors (11000)
 * - JWT errors (JsonWebTokenError, TokenExpiredError)
 * - Custom application errors
 * - Unknown errors
 */

import mongoose from 'mongoose';
import logger from '../config/logger.js';

/**
 * Check if error is a MongoDB duplicate key error
 */
const isMongooseDuplicateKeyError = (err) => {
  return err && (err.code === 11000 || err.code === 11001);
};

/**
 * Extract validation errors from Mongoose ValidationError
 */
const extractMongooseValidationErrors = (err) => {
  if (!err || !err.errors) return [];
  return Object.values(err.errors).map((e) => ({
    path: e.path,
    message: e.message
  }));
};

/**
 * Extract validation errors from Joi
 */
const extractJoiErrors = (err) => {
  if (!err || !err.details) return [];
  return err.details.map((d) => ({
    path: Array.isArray(d.path) ? d.path.join('.') : d.path,
    message: d.message.replace(/["']/g, '') // Clean up quotes
  }));
};

/**
 * Main error handler middleware
 */
export default function errorHandler(err, req, res, next) {
  // eslint-disable-line no-unused-vars

  // Joi validation error
  if (err?.isJoi || err?.name === 'ValidationError') {
    const errors = extractJoiErrors(err);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  // MongoDB duplicate key error
  if (isMongooseDuplicateKeyError(err)) {
    // Extract field name from error message
    const fieldMatch = err.message.match(/index: (\w+)/);
    const field = fieldMatch ? fieldMatch[1] : 'field';

    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists`,
      errors: [{ path: field, message: 'Duplicate value not allowed' }]
    });
  }

  // MongoDB CastError (invalid ObjectId, enum, etc.)
  if (err instanceof mongoose.Error.CastError || err?.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid format',
      errors: [{ path: err.path, message: 'Invalid value provided' }]
    });
  }

  // MongoDB ValidationError (schema validation)
  if (err instanceof mongoose.Error.ValidationError || err?.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: extractMongooseValidationErrors(err)
    });
  }

  // MongoDB DuplicateKeyError alternative check
  if (err.name === 'MongoServerError' && err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate key error',
      errors: [{ message: 'A record with this value already exists' }]
    });
  }

  // JWT errors
  if (err?.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      errors: []
    });
  }

  if (err?.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      errors: []
    });
  }

  // Custom application errors (with status code)
  if (err?.statusCode || err?.status) {
    const status = err.statusCode || err.status;
    return res.status(status).json({
      success: false,
      message: err.message || 'Error',
      errors: err.errors || []
    });
  }

  // Multer file upload errors
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large',
      errors: [{ message: 'Maximum file size exceeded' }]
    });
  }

  if (err?.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Unexpected file field',
      errors: []
    });
  }

  // Development-only error details
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Log the error
  if (err.statusCode >= 500 || !err.statusCode) {
    logger.error(err.message, {
      stack: err.stack,
      path: req.path,
      method: req.method
    });
  } else {
    logger.warn(err.message, {
      statusCode: err.statusCode,
      path: req.path,
      method: req.method
    });
  }

  // Unknown error
  return res.status(err.statusCode || 500).json({
    success: false,
    message: isDevelopment ? err.message : 'Internal Server Error',
    errors: isDevelopment && err.errors ? err.errors : []
  });
}
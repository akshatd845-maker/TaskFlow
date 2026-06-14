/**
 * Environment Variable Validator
 * Validates required environment variables at startup
 * Prevents runtime errors due to misconfiguration
 */

import Joi from 'joi';

const envSchema = Joi.object({
  // Server
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(5000),

  // MongoDB
  MONGODB_URI: Joi.string().uri().required()
    .messages({ 'any.required': 'MONGODB_URI is required' }),

  // JWT
  JWT_SECRET: Joi.string().min(32).required()
    .messages({
      'string.min': 'JWT_SECRET must be at least 32 characters for production security',
      'any.required': 'JWT_SECRET is required'
    }),
  JWT_EXPIRE: Joi.string().default('7d'),

  // CORS
  CLIENT_URL: Joi.string().uri().optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().min(1000).default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().min(1).default(100)
}).unknown(true); // Allow additional env vars

/**
 * Validate and return environment configuration
 * @returns {Object} Validated environment variables
 * @throws {Error} If validation fails
 */
export const validateEnv = () => {
  const { error, value } = envSchema.validate(process.env, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const messages = error.details.map(d => `${d.path.join('.')}: ${d.message}`).join('\n');
    console.error('Environment validation failed:\n', messages);
    throw new Error(`Environment configuration error: ${messages}`);
  }

  // Warn about development settings in production
  if (value.NODE_ENV === 'production') {
    if (value.JWT_SECRET.length < 64) {
      console.warn('WARNING: JWT_SECRET should be at least 64 characters in production');
    }
    if (value.CLIENT_URL === undefined) {
      console.warn('WARNING: CLIENT_URL not set - CORS will be open in production');
    }
  }

  return value;
};

export default validateEnv;
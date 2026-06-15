import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import userRepository from '../repositories/userRepository.js';
import { revokeToken, isTokenRevoked } from '../utils/tokenBlocklist.js';

// ─── Constants ────────────────────────────────────────────────────────────────
export const NAME_MAX = 50;
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 128;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Signs a JWT containing the user id AND a unique jti (JWT ID).
 * The jti is stored in the blocklist on logout / password change so that
 * existing tokens can be immediately invalidated without a Redis dependency.
 */
export const generateToken = (id) => {
  const jti = uuidv4();
  const token = jwt.sign({ id, jti }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return token;
};

/** Expose blocklist helpers so the auth middleware can check revocation. */
export { revokeToken, isTokenRevoked };

/**
 * Strips sensitive fields from the Mongoose user document so we never
 * accidentally serialize the password hash to the client.
 */
export const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  role: user.role,
  createdAt: user.createdAt
});

// ─── Validation ───────────────────────────────────────────────────────────────

export const validateRegisterInput = ({ name, email, password }) => {
  if (!name || typeof name !== 'string' || !name.trim())
    return 'Name is required';
  if (name.trim().length > NAME_MAX)
    return `Name cannot exceed ${NAME_MAX} characters`;
  if (!email || typeof email !== 'string' || !email.trim())
    return 'Email is required';
  if (!/^\S+@\S+\.\S+$/.test(email.trim()))
    return 'Please provide a valid email address';
  if (!password || typeof password !== 'string')
    return 'Password is required';
  if (password.length < PASSWORD_MIN)
    return `Password must be at least ${PASSWORD_MIN} characters`;
  if (password.length > PASSWORD_MAX)
    return `Password cannot exceed ${PASSWORD_MAX} characters`;
  return null;
};

// ─── Service Methods ──────────────────────────────────────────────────────────

/**
 * Registers a new user.
 * Throws an Error with a `statusCode` property on business-rule violations.
 */
export const registerUser = async ({ name, email, password }) => {
  const validationError = validateRegisterInput({ name, email, password });
  if (validationError) {
    const err = new Error(validationError);
    err.statusCode = 400;
    throw err;
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existing = await userRepository.findByEmail(normalizedEmail);
  if (existing) {
    const err = new Error('User already exists with this email');
    err.statusCode = 400;
    throw err;
  }

  const user = await userRepository.create({
    name: name.trim(),
    email: normalizedEmail,
    password
  });

  const token = generateToken(user._id);
  return { user: sanitizeUser(user), token };
};

/**
 * Authenticates an existing user.
 */
export const loginUser = async ({ email, password }) => {
  if (!email || typeof email !== 'string' || !email.trim()) {
    const err = new Error('Email is required');
    err.statusCode = 400;
    throw err;
  }
  if (!password || typeof password !== 'string') {
    const err = new Error('Password is required');
    err.statusCode = 400;
    throw err;
  }

  const normalizedEmail = email.trim().toLowerCase();
  // We need the password hash for comparison — use +password selector
  const user = await userRepository.findByEmail(normalizedEmail, '+password');

  if (!user) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  if (user.isActive === false) {
    const err = new Error('Account is deactivated');
    err.statusCode = 401;
    throw err;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = generateToken(user._id);
  return { user: sanitizeUser(user), token };
};

/**
 * Revokes the current session token so it cannot be reused after logout.
 * `currentToken` is the raw JWT string from the request (cookie or header).
 */
export const logoutUser = (currentToken) => {
  if (currentToken) {
    try {
      // Decode WITHOUT verifying (we already know it's valid from protect middleware)
      const decoded = jwt.decode(currentToken);
      if (decoded?.jti && decoded?.exp) {
        revokeToken(decoded.jti, decoded.exp);
      }
    } catch {
      // Ignore decode errors — token is being discarded anyway
    }
  }
};

/**
 * Fetches the profile of an authenticated user.
 */
export const getUserProfile = async (userId) => {
  const user = await userRepository.findById(userId, '-password');
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  return sanitizeUser(user);
};

/**
 * Updates name, email, and/or avatar of a user.
 * Returns the updated user AND a refreshed token (email change invalidates old data).
 */
export const updateUserProfile = async (userId, { name, email, avatar }) => {
  // Field-level validation
  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      const err = new Error('Name cannot be empty');
      err.statusCode = 400;
      throw err;
    }
    if (name.trim().length > NAME_MAX) {
      const err = new Error(`Name cannot exceed ${NAME_MAX} characters`);
      err.statusCode = 400;
      throw err;
    }
  }
  if (email !== undefined) {
    if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      const err = new Error('Please provide a valid email address');
      err.statusCode = 400;
      throw err;
    }
  }

  const user = await userRepository.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  // Check email uniqueness if changing
  if (email && email.trim().toLowerCase() !== user.email) {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await userRepository.findByEmail(normalizedEmail);
    if (existing && existing._id.toString() !== user._id.toString()) {
      const err = new Error('Email is already in use');
      err.statusCode = 400;
      throw err;
    }
    user.email = normalizedEmail;
  }

  if (name) user.name = name.trim();
  if (avatar !== undefined) {
    // Validate avatar is a safe https URL or empty string
    if (avatar !== '' && avatar !== null) {
      if (typeof avatar !== 'string' || !/^https:\/\/.+/i.test(avatar.trim())) {
        const err = new Error('Avatar must be a valid https:// URL');
        err.statusCode = 400;
        throw err;
      }
      user.avatar = avatar.trim();
    } else {
      user.avatar = avatar; // allow clearing with '' or null
    }
  }

  const updatedUser = await user.save();
  const token = generateToken(updatedUser._id);
  return { user: sanitizeUser(updatedUser), token };
};

/**
 * Updates user password after verifying the current one.
 * Issues a fresh token upon success.
 */
export const updateUserPassword = async (userId, { currentPassword, newPassword }, currentToken = null) => {
  if (!currentPassword || !newPassword) {
    const err = new Error('Please provide current and new password');
    err.statusCode = 400;
    throw err;
  }
  if (typeof newPassword !== 'string' || newPassword.length < PASSWORD_MIN) {
    const err = new Error(`New password must be at least ${PASSWORD_MIN} characters`);
    err.statusCode = 400;
    throw err;
  }
  if (newPassword.length > PASSWORD_MAX) {
    const err = new Error(`New password cannot exceed ${PASSWORD_MAX} characters`);
    err.statusCode = 400;
    throw err;
  }

  const user = await userRepository.findById(userId, '+password');
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    const err = new Error('Current password is incorrect');
    err.statusCode = 401;
    throw err;
  }

  user.password = newPassword;
  await user.save();

  // Revoke the old token so existing sessions are invalidated immediately
  if (currentToken) {
    try {
      const decoded = jwt.decode(currentToken);
      if (decoded?.jti && decoded?.exp) {
        revokeToken(decoded.jti, decoded.exp);
      }
    } catch { /* ignore */ }
  }

  const token = generateToken(user._id);
  return { token };
};

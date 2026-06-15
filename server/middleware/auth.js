import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { getTokenFromRequest } from '../utils/authCookie.js';
import { isTokenRevoked } from '../utils/tokenBlocklist.js';
import logger from '../config/logger.js';

// @desc    Protect routes - verify JWT from cookie or Bearer header
// @access  Private
export const protect = async (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ── SECURITY: Check if token has been explicitly revoked (logout / pw change) ──
    if (decoded.jti && await isTokenRevoked(decoded.jti)) {
      return res.status(401).json({ message: 'Token has been revoked, please login again' });
    }

    // H3 FIX: Use lean() + select only needed fields to reduce per-request DB cost
    const user = await User.findById(decoded.id).select('-password').lean();

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // H10 FIX: Reject deactivated accounts
    if (user.isActive === false) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Attach decoded token to request for downstream use (e.g. logout revocation)
    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    // Distinguish token errors from other errors for cleaner client handling
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired, please login again' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    logger.error('Auth middleware error', { error: error.message });
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

// @desc    Authorize roles
// @access  Private
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};

// @desc    Optional authentication - doesn't fail if no token
// @access  Public
export const optionalAuth = async (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Also respect revoked tokens in optional auth
      if (!decoded.jti || !(await isTokenRevoked(decoded.jti))) {
        req.user = await User.findById(decoded.id).select('-password').lean();
      }
    } catch {
      req.user = null;
    }
  }

  next();
};

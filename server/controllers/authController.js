import {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  updateUserPassword
} from '../services/authService.js';
import { setAuthCookie, clearAuthCookie } from '../utils/authCookie.js';
import { getTokenFromRequest } from '../utils/authCookie.js';
import logger from '../config/logger.js';

// ─── Thin HTTP Handler Helpers ────────────────────────────────────────────────

/**
 * Converts a service-layer Error (with optional statusCode) into an HTTP response.
 */
const handleServiceError = (res, error) => {
  const status = error.statusCode || 500;
  logger.error(error.message, { error: error.stack });
  return res.status(status).json({ message: error.message });
};

// ─── Controllers ──────────────────────────────────────────────────────────────

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const { user, token } = await registerUser({ name, email, password });
    setAuthCookie(res, token);
    res.status(201).json(user);
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await loginUser({ email, password });
    setAuthCookie(res, token);
    res.json(user);
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res) => {
  try {
    // Revoke current token so it can't be reused after logout
    logoutUser(req.token);
    clearAuthCookie(res);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = async (req, res) => {
  try {
    const user = await getUserProfile(req.user._id);
    res.json(user);
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const { name, email, avatar } = req.body;
    const { user, token } = await updateUserProfile(req.user._id, { name, email, avatar });
    setAuthCookie(res, token);
    res.json(user);
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Update password
// @route   PUT /api/auth/password
// @access  Private
export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    // Pass the current token so the service can revoke it immediately
    const { token } = await updateUserPassword(
      req.user._id,
      { currentPassword, newPassword },
      req.token
    );
    setAuthCookie(res, token);
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    handleServiceError(res, error);
  }
};

import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { setAuthCookie, clearAuthCookie } from '../utils/authCookie.js';

// H2 FIX: Reduced from 30d to 7d. Embed iat so future revocation via
// a "password changed at" timestamp comparison is straightforward.
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

// H1 FIX: Strict input validation constants
const NAME_MAX = 50;
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 128;

const validateRegisterInput = ({ name, email, password }) => {
  if (!name || typeof name !== 'string' || !name.trim()) {
    return 'Name is required';
  }
  if (name.trim().length > NAME_MAX) {
    return `Name cannot exceed ${NAME_MAX} characters`;
  }
  if (!email || typeof email !== 'string' || !email.trim()) {
    return 'Email is required';
  }
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
    return 'Please provide a valid email address';
  }
  if (!password || typeof password !== 'string') {
    return 'Password is required';
  }
  if (password.length < PASSWORD_MIN) {
    return `Password must be at least ${PASSWORD_MIN} characters`;
  }
  if (password.length > PASSWORD_MAX) {
    return `Password cannot exceed ${PASSWORD_MAX} characters`;
  }
  return null;
};

const userResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  role: user.role,
  createdAt: user.createdAt
});

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // H1 FIX: Validate inputs before hitting the DB
    const validationError = validateRegisterInput({ name, email, password });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password
    });

    const token = generateToken(user._id);
    setAuthCookie(res, token);

    res.status(201).json(userResponse(user));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ message: 'Email is required' });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ message: 'Password is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // H10 FIX: Block deactivated accounts at login too
    if (user.isActive === false) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Update lastLogin
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);
    setAuthCookie(res, token);

    res.json(userResponse(user));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res) => {
  try {
    clearAuthCookie(res);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = async (req, res) => {
  try {
    // req.user is already populated by protect middleware (lean object)
    // Re-fetch only if we need fresh data (e.g. after profile update)
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(userResponse(user));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const { name, email, avatar } = req.body;

    // Input validation
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ message: 'Name cannot be empty' });
      }
      if (name.trim().length > NAME_MAX) {
        return res.status(400).json({ message: `Name cannot exceed ${NAME_MAX} characters` });
      }
    }
    if (email !== undefined) {
      if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) {
        return res.status(400).json({ message: 'Please provide a valid email address' });
      }
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (email && email.trim().toLowerCase() !== user.email) {
      const existing = await User.findOne({ email: email.trim().toLowerCase() });
      if (existing && existing._id.toString() !== user._id.toString()) {
        return res.status(400).json({ message: 'Email is already in use' });
      }
      user.email = email.trim().toLowerCase();
    }

    if (name) user.name = name.trim();
    if (avatar !== undefined) user.avatar = avatar;

    const updatedUser = await user.save();
    const token = generateToken(updatedUser._id);
    setAuthCookie(res, token);

    res.json(userResponse(updatedUser));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update password
// @route   PUT /api/auth/password
// @access  Private
export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide current and new password' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < PASSWORD_MIN) {
      return res.status(400).json({ message: `New password must be at least ${PASSWORD_MIN} characters` });
    }
    if (newPassword.length > PASSWORD_MAX) {
      return res.status(400).json({ message: `New password cannot exceed ${PASSWORD_MAX} characters` });
    }

    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    // Re-issue token after password change so existing sessions stay valid
    // (in production you'd invalidate old tokens via a jti blocklist)
    const token = generateToken(user._id);
    setAuthCookie(res, token);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

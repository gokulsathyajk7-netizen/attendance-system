import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../config/db.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { sendEmail } from '../services/emailService.js';
import { createNotification } from '../services/notificationService.js';
import logger from '../config/logger.js';
import { validationResult } from 'express-validator';

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

if (!email || !password) {
  return errorResponse(res, 'Email and password are required', 400);
}

    const [rows] = await pool.execute(
      `SELECT u.*, e.id as employee_id, e.first_name, e.last_name, e.profile_image, e.status as emp_status
       FROM users u
       LEFT JOIN employees e ON e.user_id = u.id
       WHERE u.email = ?`,
      [String(email).toLowerCase().trim()]
    );

    if (!rows.length) return errorResponse(res, 'Invalid credentials', 401);
    const user = rows[0];

    if (!user.is_active) return errorResponse(res, 'Account is suspended. Contact admin.', 403);
    if (user.emp_status === 'suspended') return errorResponse(res, 'Employee account suspended.', 403);

    const errors = validationResult(req);

if (!errors.isEmpty()) {
  return res.status(400).json({
    success: false,
    errors: errors.array(),
  });
}

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return errorResponse(res, 'Invalid credentials', 401);

    const tokenPayload = { userId: user.id, role: user.role, email: user.email };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token hash
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await pool.execute(
      `UPDATE users SET refresh_token = ?, last_login = NOW() WHERE id = ?`,
      [tokenHash, user.id]
    );

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
    });



    try {
  await createNotification(
    user.id,
    'Login Alert',
    `New login from ${req.ip}`,
    'info'
  );
} catch (err) {
  logger.error('Notification error:', err);
}

    return successResponse(res, {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employeeId: user.employee_id,
        name: user.first_name ? `${user.first_name} ${user.last_name}` : null,
        profileImage: user.profile_image,
      },
    }, 'Login successful');
  } catch (err) {
    logger.error('Login error:', err);
    return errorResponse(res, 'Login failed', 500);
  }
};

// POST /api/auth/refresh
export const refreshToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return errorResponse(res, 'Refresh token missing', 401);

    const decoded = verifyRefreshToken(token);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const [rows] = await pool.execute(
      `SELECT id, email, role, is_active, refresh_token FROM users WHERE id = ?`,
      [decoded.userId]
    );

    if (!rows.length || rows[0].refresh_token !== tokenHash) {
      return errorResponse(res, 'Invalid refresh token', 401);
    }

    if (!rows[0].is_active) return errorResponse(res, 'Account suspended', 403);

    const user = rows[0];
    const tokenPayload = { userId: user.id, role: user.role, email: user.email };
    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    const newHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    await pool.execute(`UPDATE users SET refresh_token = ? WHERE id = ?`, [newHash, user.id]);

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return successResponse(res, { accessToken: newAccessToken }, 'Token refreshed');
  } catch (err) {
    return errorResponse(res, 'Token refresh failed', 401);
  }
};

// POST /api/auth/logout
export const logout = async (req, res) => {
  try {
    await pool.execute(`UPDATE users SET refresh_token = NULL WHERE id = ?`, [req.user.id]);
    res.clearCookie('refreshToken');
    return successResponse(res, {}, 'Logged out successfully');
  } catch (err) {
    return errorResponse(res, 'Logout failed', 500);
  }
};

// POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const [rows] = await pool.execute(
      `SELECT u.id, u.email, e.first_name FROM users u LEFT JOIN employees e ON e.user_id = u.id WHERE u.email = ?`,
      [String(email).toLowerCase().trim()]
    );

    // Always return success to prevent email enumeration
    if (!rows.length) return successResponse(res, {}, 'If this email exists, a reset link was sent.');

    const user = rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.execute(
      `UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?`,
      [hashedToken, expires, user.id]
    );

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    await sendEmail(user.email, 'passwordReset', user.first_name || 'User', resetUrl);

    return successResponse(res, {}, 'Password reset link sent to your email.');
  } catch (err) {
    logger.error('Forgot password error:', err);
    return errorResponse(res, 'Failed to process request', 500);
  }
};

// POST /api/auth/reset-password
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const [rows] = await pool.execute(
      `SELECT id FROM users WHERE password_reset_token = ? AND password_reset_expires > NOW()`,
      [hashedToken]
    );

    if (!rows.length) return errorResponse(res, 'Invalid or expired reset token', 400);

    const passwordHash = await bcrypt.hash(password, 12);
    await pool.execute(
      `UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL, refresh_token = NULL WHERE id = ?`,
      [passwordHash, rows[0].id]
    );

    res.clearCookie('refreshToken');
    return successResponse(res, {}, 'Password reset successfully. Please login.');
  } catch (err) {
    logger.error('Reset password error:', err);
    return errorResponse(res, 'Password reset failed', 500);
  }
};

// GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.id, u.email, u.role, u.last_login,
              e.id as employee_id, e.employee_code, e.first_name, e.last_name,
              e.mobile, e.designation, e.profile_image, e.status,
              d.name as department
       FROM users u
       LEFT JOIN employees e ON e.user_id = u.id
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE u.id = ?`,
      [req.user.id]
    );
    if (!rows.length) return errorResponse(res, 'User not found', 404);
    return successResponse(res, rows[0]);
  } catch (err) {
    return errorResponse(res, 'Failed to get user', 500);
  }
};

// PUT /api/auth/change-password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const [rows] = await pool.execute(`SELECT password_hash FROM users WHERE id = ?`, [req.user.id]);
    if (!rows.length) return errorResponse(res, 'User not found', 404);

    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) return errorResponse(res, 'Current password is incorrect', 400);

    const hash = await bcrypt.hash(newPassword, 12);
    await pool.execute(`UPDATE users SET password_hash = ? WHERE id = ?`, [hash, req.user.id]);

    return successResponse(res, {}, 'Password changed successfully');
  } catch (err) {
    return errorResponse(res, 'Failed to change password', 500);
  }
};

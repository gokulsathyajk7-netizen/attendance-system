import { verifyAccessToken } from '../utils/jwt.js';
import { errorResponse } from '../utils/response.js';
import pool from '../config/db.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) return errorResponse(res, 'Authentication required', 401);

    const decoded = verifyAccessToken(token);

    const [rows] = await pool.execute(
      `SELECT id, email, role, is_active FROM users WHERE id = ?`,
      [decoded.userId]
    );

    if (!rows.length) return errorResponse(res, 'User not found', 401);
    if (!rows[0].is_active) return errorResponse(res, 'Account suspended', 403);

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return errorResponse(res, 'Token expired', 401);
    if (err.name === 'JsonWebTokenError') return errorResponse(res, 'Invalid token', 401);
    console.error(err);
    return errorResponse(res, 'Authentication failed', 401);
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return errorResponse(res, 'Insufficient permissions', 403);
    }
    next();
  };
};

export const authorizeEmployee = async (req, res, next) => {
  // Allow access to own data or admin roles
  try {
    const { id } = req.params;
    const adminRoles = ['super_admin', 'admin', 'manager'];

    if (adminRoles.includes(req.user.role)) return next();

    const [rows] = await pool.execute(
      `SELECT id FROM employees WHERE user_id = ? AND id = ?`,
      [req.user.id, id]
    );

    if (!rows.length) return errorResponse(res, 'Access denied', 403);
    next();
  } catch (err) {
    return errorResponse(res, 'Authorization failed', 500);
  }
};

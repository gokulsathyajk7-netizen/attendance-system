import pool from '../config/db.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js';
import { createNotification, notifyAdmins } from '../services/notificationService.js';
import { sendEmail } from '../services/emailService.js';
import logger from '../config/logger.js';

const getEmpFromUser = async (userId) => {
  const [rows] = await pool.execute(`SELECT id, first_name, last_name FROM employees WHERE user_id = ?`, [userId]);
  return rows[0] || null;
};

const calcWorkingDays = (fromDate, toDate) => {
  let count = 0;
  const current = new Date(fromDate);
  const end = new Date(toDate);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
};

// POST /api/leaves
export const applyLeave = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { leave_type_id, from_date, to_date, reason } = req.body;

    const emp = await getEmpFromUser(req.user.id);
    if (!emp) return errorResponse(res, 'Employee not found', 404);

    const totalDays = calcWorkingDays(from_date, to_date);
    if (totalDays <= 0) return errorResponse(res, 'Invalid date range', 400);

    // Check leave balance
    const year = new Date(from_date).getFullYear();
    const [balance] = await conn.execute(
      `SELECT * FROM leave_balances WHERE employee_id = ? AND leave_type_id = ? AND year = ?`,
      [emp.id, leave_type_id, year]
    );

    if (!balance.length || balance[0].remaining_days < totalDays) {
      return errorResponse(res, `Insufficient leave balance. Available: ${balance[0]?.remaining_days || 0} days`, 400);
    }

    // Check for overlapping leaves
    const [overlap] = await conn.execute(
      `SELECT id FROM leaves WHERE employee_id = ? AND status NOT IN ('rejected','cancelled')
       AND ((from_date BETWEEN ? AND ?) OR (to_date BETWEEN ? AND ?) OR (? BETWEEN from_date AND to_date))`,
      [emp.id, from_date, to_date, from_date, to_date, from_date]
    );

    if (overlap.length) return errorResponse(res, 'You have an overlapping leave request for these dates', 400);

    const attachment = req.file ? `leaves/${req.file.filename}` : null;

    const [result] = await conn.execute(
      `INSERT INTO leaves (employee_id, leave_type_id, from_date, to_date, total_days, reason, attachment)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [emp.id, leave_type_id, from_date, to_date, totalDays, reason, attachment]
    );

    // Block pending days in balance
    await conn.execute(
      `UPDATE leave_balances SET pending_days = pending_days + ?, remaining_days = remaining_days - ?
       WHERE employee_id = ? AND leave_type_id = ? AND year = ?`,
      [totalDays, totalDays, emp.id, leave_type_id, year]
    );

    await conn.commit();

    await createNotification(req.user.id, 'Leave Applied', `Your leave request for ${totalDays} day(s) is pending approval.`, 'info');
    await notifyAdmins('New Leave Request', `${emp.first_name} ${emp.last_name} applied for ${totalDays} day(s) of leave from ${from_date} to ${to_date}.`, 'info');

    return successResponse(res, { leaveId: result.insertId, totalDays }, 'Leave applied successfully', 201);
  } catch (err) {
    await conn.rollback();
    logger.error('Apply leave error:', err);
    return errorResponse(res, 'Failed to apply leave', 500);
  } finally {
    conn.release();
  }
};

// GET /api/leaves
export const getLeaves = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, employee_id, from_date, to_date } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const isAdmin = ['super_admin', 'admin', 'manager'].includes(req.user.role);

    const conditions = [];
    const params = [];

    if (!isAdmin) {
      const emp = await getEmpFromUser(req.user.id);
      if (!emp) return errorResponse(res, 'Employee not found', 404);
      conditions.push(`l.employee_id = ?`);
      params.push(emp.id);
    } else if (employee_id) {
      conditions.push(`l.employee_id = ?`);
      params.push(employee_id);
    }

    if (status) { conditions.push(`l.status = ?`); params.push(status); }
    if (from_date) { conditions.push(`l.from_date >= ?`); params.push(from_date); }
    if (to_date) { conditions.push(`l.to_date <= ?`); params.push(to_date); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await pool.execute(`SELECT COUNT(*) as total FROM leaves l ${where}`, params);
    const [rows] = await pool.execute(
      `SELECT l.*, lt.name as leave_type_name, lt.code as leave_type_code,
              e.first_name, e.last_name, e.employee_code,
              CONCAT(r.first_name, ' ', r.last_name) as reviewed_by_name
       FROM leaves l
       JOIN leave_types lt ON lt.id = l.leave_type_id
       JOIN employees e ON e.id = l.employee_id
       LEFT JOIN employees r ON r.user_id = l.reviewed_by
       ${where}
       ORDER BY l.applied_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    return paginatedResponse(res, rows, countRows[0].total, page, limit);
  } catch (err) {
    logger.error('Get leaves error:', err);
    return errorResponse(res, 'Failed to get leaves', 500);
  }
};

// PUT /api/leaves/:id (Admin: approve/reject)
export const reviewLeave = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const { status, review_comment } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return errorResponse(res, 'Status must be approved or rejected', 400);
    }

    const [rows] = await conn.execute(
      `SELECT l.*, e.user_id, e.first_name, u.email, lt.name as leave_type_name
       FROM leaves l
       JOIN employees e ON e.id = l.employee_id
       JOIN users u ON u.id = e.user_id
       JOIN leave_types lt ON lt.id = l.leave_type_id
       WHERE l.id = ?`,
      [id]
    );

    if (!rows.length) return errorResponse(res, 'Leave not found', 404);
    const leave = rows[0];

    if (leave.status !== 'pending') {
      return errorResponse(res, `Leave is already ${leave.status}`, 400);
    }

    await conn.execute(
      `UPDATE leaves SET status = ?, reviewed_by = ?, reviewed_at = NOW(), review_comment = ? WHERE id = ?`,
      [status, req.user.id, review_comment || null, id]
    );

    const year = new Date(leave.from_date).getFullYear();

    if (status === 'approved') {
      // Convert pending to used
      await conn.execute(
        `UPDATE leave_balances SET pending_days = pending_days - ?, used_days = used_days + ?
         WHERE employee_id = ? AND leave_type_id = ? AND year = ?`,
        [leave.total_days, leave.total_days, leave.employee_id, leave.leave_type_id, year]
      );

      // Mark attendance as leave for each day
      let current = new Date(leave.from_date);
      const end = new Date(leave.to_date);
      while (current <= end) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) {
          const dateStr = current.toISOString().split('T')[0];
          await conn.execute(
            `INSERT INTO attendance (employee_id, attendance_date, status) VALUES (?, ?, 'leave')
             ON DUPLICATE KEY UPDATE status = 'leave'`,
            [leave.employee_id, dateStr]
          );
        }
        current.setDate(current.getDate() + 1);
      }
    } else {
      // Restore balance on rejection
      await conn.execute(
        `UPDATE leave_balances SET pending_days = pending_days - ?, remaining_days = remaining_days + ?
         WHERE employee_id = ? AND leave_type_id = ? AND year = ?`,
        [leave.total_days, leave.total_days, leave.employee_id, leave.leave_type_id, year]
      );
    }

    await conn.commit();

    const dates = `${leave.from_date} to ${leave.to_date}`;
    await createNotification(leave.user_id, `Leave ${status}`,
      `Your ${leave.leave_type_name} leave for ${dates} has been ${status}.${review_comment ? ' Comment: ' + review_comment : ''}`,
      status === 'approved' ? 'success' : 'error'
    );

    sendEmail(leave.email, 'leaveApproval', leave.first_name, status, leave.leave_type_name, dates, review_comment).catch(() => {});

    return successResponse(res, {}, `Leave ${status} successfully`);
  } catch (err) {
    await conn.rollback();
    logger.error('Review leave error:', err);
    return errorResponse(res, 'Failed to review leave', 500);
  } finally {
    conn.release();
  }
};

// DELETE /api/leaves/:id (Cancel - employee)
export const cancelLeave = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const emp = await getEmpFromUser(req.user.id);

    const [rows] = await conn.execute(
      `SELECT * FROM leaves WHERE id = ? AND employee_id = ?`,
      [id, emp.id]
    );

    if (!rows.length) return errorResponse(res, 'Leave not found', 404);
    if (!['pending', 'approved'].includes(rows[0].status)) {
      return errorResponse(res, 'Cannot cancel this leave', 400);
    }

    await conn.execute(`UPDATE leaves SET status = 'cancelled' WHERE id = ?`, [id]);

    const year = new Date(rows[0].from_date).getFullYear();
    const restorePending = rows[0].status === 'pending' ? rows[0].total_days : 0;
    const restoreUsed = rows[0].status === 'approved' ? rows[0].total_days : 0;

    await conn.execute(
      `UPDATE leave_balances SET
         pending_days = GREATEST(0, pending_days - ?),
         used_days = GREATEST(0, used_days - ?),
         remaining_days = remaining_days + ?
       WHERE employee_id = ? AND leave_type_id = ? AND year = ?`,
      [restorePending, restoreUsed, rows[0].total_days, emp.id, rows[0].leave_type_id, year]
    );

    await conn.commit();
    return successResponse(res, {}, 'Leave cancelled successfully');
  } catch (err) {
    await conn.rollback();
    return errorResponse(res, 'Failed to cancel leave', 500);
  } finally {
    conn.release();
  }
};

// GET /api/leaves/balance
export const getLeaveBalance = async (req, res) => {
  try {
    const emp = await getEmpFromUser(req.user.id);
    if (!emp) return errorResponse(res, 'Employee not found', 404);

    const year = req.query.year || new Date().getFullYear();

    const [rows] = await pool.execute(
      `SELECT lb.*, lt.name, lt.code, lt.is_paid
       FROM leave_balances lb
       JOIN leave_types lt ON lt.id = lb.leave_type_id
       WHERE lb.employee_id = ? AND lb.year = ?`,
      [emp.id, year]
    );

    return successResponse(res, rows);
  } catch (err) {
    return errorResponse(res, 'Failed to get leave balance', 500);
  }
};

// GET /api/leaves/types
export const getLeaveTypes = async (req, res) => {
  try {
    const [rows] = await pool.execute(`SELECT * FROM leave_types WHERE is_active = 1`);
    return successResponse(res, rows);
  } catch (err) {
    return errorResponse(res, 'Failed to get leave types', 500);
  }
};

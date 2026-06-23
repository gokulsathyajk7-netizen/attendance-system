import pool from '../config/db.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js';
import { isInsideGeofence, isLate, getWorkingMinutes, todayDate, minutesToHHMM } from '../utils/geofence.js';
import { createNotification, notifyAdmins } from '../services/notificationService.js';
import logger from '../config/logger.js';

// Helper: Get employee from user
const getEmpFromUser = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT id, first_name, last_name, status FROM employees WHERE user_id = ?`,
    [userId]
  );
  return rows[0] || null;
};

// POST /api/attendance/checkin
export const checkIn = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { latitude, longitude, accuracy, device_info } = req.body;
    const today = todayDate();

    const emp = await getEmpFromUser(req.user.id);
    if (!emp) return errorResponse(res, 'Employee profile not found', 404);
    if (emp.status !== 'active') return errorResponse(res, 'Employee account is not active', 403);

    // Check if already checked in today
    const [existing] = await conn.execute(
      `SELECT id, check_in_time, check_out_time FROM attendance WHERE employee_id = ? AND attendance_date = ?`,
      [emp.id, today]
    );

    if (existing.length && existing[0].check_in_time) {
      return errorResponse(res, 'Already checked in for today', 400);
    }

    // Geofence validation
    let insideGeofence = true;
    let geoDistance = null;
    let geofenceId = null;

    if (latitude && longitude) {
      const [geofences] = await conn.execute(
        `SELECT id, latitude, longitude, radius_meters FROM geofences WHERE is_active = 1 LIMIT 1`
      );

      if (geofences.length) {
        const geo = geofences[0];
        const result = isInsideGeofence(latitude, longitude, geo.latitude, geo.longitude, geo.radius_meters);
        insideGeofence = result.inside;
        geoDistance = result.distance;
        geofenceId = geo.id;

        if (!insideGeofence) {
          return errorResponse(res, `You are ${geoDistance}m away from office. Check-in requires being within ${geo.radius_meters}m.`, 400);
        }
      }
    }

    const now = new Date();
    const lateCheck = isLate(now);

    let attendanceId;
    if (existing.length) {
      // Update existing record
      await conn.execute(
        `UPDATE attendance SET check_in_time = NOW(), status = 'present', is_late = ?, late_by_minutes = ?,
         check_in_lat = ?, check_in_lng = ?, inside_geofence = ?, geofence_id = ?
         WHERE id = ?`,
        [lateCheck.isLate ? 1 : 0, lateCheck.lateByMinutes, latitude, longitude, insideGeofence ? 1 : 0, geofenceId, existing[0].id]
      );
      attendanceId = existing[0].id;
    } else {
      // Create new record
      const [attResult] = await conn.execute(
        `INSERT INTO attendance (employee_id, attendance_date, status, check_in_time, is_late, late_by_minutes, check_in_lat, check_in_lng, inside_geofence, geofence_id)
         VALUES (?, ?, 'present', NOW(), ?, ?, ?, ?, ?, ?)`,
        [emp.id, today, lateCheck.isLate ? 1 : 0, lateCheck.lateByMinutes, latitude, longitude, insideGeofence ? 1 : 0, geofenceId]
      );
      attendanceId = attResult.insertId;
    }

    // Log the action
    await conn.execute(
      `INSERT INTO attendance_logs (attendance_id, employee_id, action, latitude, longitude, accuracy, device_info, ip_address)
       VALUES (?, ?, 'check_in', ?, ?, ?, ?, ?)`,
      [attendanceId, emp.id, latitude, longitude, accuracy, device_info, req.ip]
    );

    // Update live location
    if (latitude && longitude) {
      await conn.execute(
        `INSERT INTO locations (employee_id, latitude, longitude, accuracy) VALUES (?, ?, ?, ?)`,
        [emp.id, latitude, longitude, accuracy]
      );
    }

    await conn.commit();

    const lateMsg = lateCheck.isLate ? ` (Late by ${lateCheck.lateByMinutes} min)` : '';
    await createNotification(req.user.id, 'Check-In Recorded', `Checked in at ${now.toLocaleTimeString()}${lateMsg}`, 'success');
    if (lateCheck.isLate) {
      await notifyAdmins('Late Check-In', `${emp.first_name} ${emp.last_name} checked in late by ${lateCheck.lateByMinutes} minutes.`, 'warning');
    }

    return successResponse(res, {
      attendanceId,
      checkInTime: now.toISOString(),
      isLate: lateCheck.isLate,
      lateByMinutes: lateCheck.lateByMinutes,
    }, 'Checked in successfully');
  } catch (err) {
    await conn.rollback();
    logger.error('Check-in error:', err);
    return errorResponse(res, 'Check-in failed', 500);
  } finally {
    conn.release();
  }
};

// POST /api/attendance/checkout
export const checkOut = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { latitude, longitude, accuracy, device_info } = req.body;
    const today = todayDate();

    const emp = await getEmpFromUser(req.user.id);
    if (!emp) return errorResponse(res, 'Employee profile not found', 404);

    const [rows] = await conn.execute(
      `SELECT id, check_in_time, check_out_time, break_duration_minutes FROM attendance WHERE employee_id = ? AND attendance_date = ?`,
      [emp.id, today]
    );

    if (!rows.length || !rows[0].check_in_time) {
      return errorResponse(res, 'No check-in found for today', 400);
    }

    if (rows[0].check_out_time) {
      return errorResponse(res, 'Already checked out for today', 400);
    }

    const att = rows[0];
    const now = new Date();
    const totalMinutes = getWorkingMinutes(att.check_in_time, now);
    const workingMinutes = Math.max(0, totalMinutes - (att.break_duration_minutes || 0));
    const standardWorkMinutes = 8 * 60; // 8 hours
    const overtimeMinutes = Math.max(0, workingMinutes - standardWorkMinutes);

    let newStatus = 'present';
    if (workingMinutes < 4 * 60) newStatus = 'half_day';

    await conn.execute(
      `UPDATE attendance SET check_out_time = NOW(), total_working_minutes = ?, overtime_minutes = ?, status = ?,
       check_out_lat = ?, check_out_lng = ?
       WHERE id = ?`,
      [workingMinutes, overtimeMinutes, newStatus, latitude, longitude, att.id]
    );

    await conn.execute(
      `INSERT INTO attendance_logs (attendance_id, employee_id, action, latitude, longitude, accuracy, device_info, ip_address)
       VALUES (?, ?, 'check_out', ?, ?, ?, ?, ?)`,
      [att.id, emp.id, latitude, longitude, accuracy, device_info, req.ip]
    );

    if (latitude && longitude) {
      await conn.execute(
        `INSERT INTO locations (employee_id, latitude, longitude, accuracy) VALUES (?, ?, ?, ?)`,
        [emp.id, latitude, longitude, accuracy]
      );
    }

    await conn.commit();

    await createNotification(req.user.id, 'Check-Out Recorded',
      `Checked out at ${now.toLocaleTimeString()}. Working hours: ${minutesToHHMM(workingMinutes)}`, 'success');

    return successResponse(res, {
      checkOutTime: now.toISOString(),
      totalWorkingMinutes: workingMinutes,
      totalWorkingHours: minutesToHHMM(workingMinutes),
      overtimeMinutes,
    }, 'Checked out successfully');
  } catch (err) {
    await conn.rollback();
    logger.error('Check-out error:', err);
    return errorResponse(res, 'Check-out failed', 500);
  } finally {
    conn.release();
  }
};

// POST /api/attendance/break
export const toggleBreak = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { action } = req.body; // 'break_start' or 'break_end'
    const today = todayDate();

    const emp = await getEmpFromUser(req.user.id);
    if (!emp) return errorResponse(res, 'Employee not found', 404);

    const [rows] = await conn.execute(
      `SELECT id, check_in_time, check_out_time FROM attendance WHERE employee_id = ? AND attendance_date = ?`,
      [emp.id, today]
    );

    if (!rows.length || !rows[0].check_in_time || rows[0].check_out_time) {
      return errorResponse(res, 'Invalid attendance state for break action', 400);
    }

    if (!['break_start', 'break_end'].includes(action)) {
      return errorResponse(res, 'Invalid action. Use break_start or break_end', 400);
    }

    // Get last log to validate sequence
    const [lastLog] = await conn.execute(
      `SELECT action FROM attendance_logs WHERE attendance_id = ? ORDER BY action_time DESC LIMIT 1`,
      [rows[0].id]
    );

    const lastAction = lastLog[0]?.action;
    if (action === 'break_start' && lastAction === 'break_start') {
      return errorResponse(res, 'Break already started', 400);
    }
    if (action === 'break_end' && lastAction !== 'break_start') {
      return errorResponse(res, 'No active break to end', 400);
    }

    // If break_end, calculate break duration and add to total
    if (action === 'break_end') {
      const [breakStart] = await conn.execute(
        `SELECT action_time FROM attendance_logs WHERE attendance_id = ? AND action = 'break_start' ORDER BY action_time DESC LIMIT 1`,
        [rows[0].id]
      );
      if (breakStart.length) {
        const breakMinutes = Math.floor((new Date() - new Date(breakStart[0].action_time)) / 60000);
        await conn.execute(
          `UPDATE attendance SET break_duration_minutes = break_duration_minutes + ? WHERE id = ?`,
          [breakMinutes, rows[0].id]
        );
      }
    }

    await conn.execute(
      `INSERT INTO attendance_logs (attendance_id, employee_id, action, ip_address) VALUES (?, ?, ?, ?)`,
      [rows[0].id, emp.id, action, req.ip]
    );

    await conn.commit();
    return successResponse(res, {}, action === 'break_start' ? 'Break started' : 'Break ended');
  } catch (err) {
    await conn.rollback();
    return errorResponse(res, 'Break action failed', 500);
  } finally {
    conn.release();
  }
};

// GET /api/attendance/today
export const getTodayAttendance = async (req, res) => {
  try {
    const emp = await getEmpFromUser(req.user.id);
    if (!emp) return errorResponse(res, 'Employee not found', 404);

    const today = todayDate();
    const [rows] = await pool.execute(
      `SELECT a.*, 
              al.action as last_action, al.action_time as last_action_time
       FROM attendance a
       LEFT JOIN attendance_logs al ON al.attendance_id = a.id
       WHERE a.employee_id = ? AND a.attendance_date = ?
       ORDER BY al.action_time DESC LIMIT 1`,
      [emp.id, today]
    );

    return successResponse(res, rows[0] || { status: 'not_started', attendance_date: today });
  } catch (err) {
    return errorResponse(res, 'Failed to get today attendance', 500);
  }
};

// GET /api/attendance/history
export const getAttendanceHistory = async (req, res) => {
  try {
    const { page = 1, limit = 30, employee_id, from_date, to_date, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const emp = await getEmpFromUser(req.user.id);
    const adminRoles = ['super_admin', 'admin', 'manager'];
    const isAdmin = adminRoles.includes(req.user.role);

    const targetEmpId = isAdmin && employee_id ? employee_id : emp?.id;
    if (!targetEmpId) return errorResponse(res, 'Employee not found', 404);

    const conditions = [`a.employee_id = ?`];
    const params = [targetEmpId];

    if (from_date) { conditions.push(`a.attendance_date >= ?`); params.push(from_date); }
    if (to_date) { conditions.push(`a.attendance_date <= ?`); params.push(to_date); }
    if (status) { conditions.push(`a.status = ?`); params.push(status); }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const [countRows] = await pool.execute(`SELECT COUNT(*) as total FROM attendance a ${where}`, params);
    const [rows] = await pool.execute(
      `SELECT a.*, e.first_name, e.last_name, e.employee_code
       FROM attendance a
       JOIN employees e ON e.id = a.employee_id
       ${where}
       ORDER BY a.attendance_date DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    return paginatedResponse(res, rows, countRows[0].total, page, limit);
  } catch (err) {
    logger.error('Attendance history error:', err);
    return errorResponse(res, 'Failed to get attendance history', 500);
  }
};

// GET /api/attendance/summary
export const getAttendanceSummary = async (req, res) => {
  try {
    const { month, year, employee_id } = req.query;
    const m = month || new Date().getMonth() + 1;
    const y = year || new Date().getFullYear();

    const emp = await getEmpFromUser(req.user.id);
    const isAdmin = ['super_admin', 'admin', 'manager'].includes(req.user.role);
    const targetEmpId = isAdmin && employee_id ? employee_id : emp?.id;

    const [rows] = await pool.execute(
      `SELECT 
         COUNT(*) as total_days,
         SUM(status = 'present') as present_days,
         SUM(status = 'absent') as absent_days,
         SUM(status = 'half_day') as half_days,
         SUM(status = 'leave') as leave_days,
         SUM(is_late = 1) as late_days,
         SUM(total_working_minutes) as total_working_minutes,
         SUM(overtime_minutes) as total_overtime_minutes,
         AVG(total_working_minutes) as avg_working_minutes
       FROM attendance
       WHERE employee_id = ? AND MONTH(attendance_date) = ? AND YEAR(attendance_date) = ?`,
      [targetEmpId, m, y]
    );

    return successResponse(res, rows[0]);
  } catch (err) {
    return errorResponse(res, 'Failed to get summary', 500);
  }
};

// GET /api/attendance/dashboard (Admin)
export const getDashboardStats = async (req, res) => {
  try {
    const today = todayDate();

    const [totalEmp] = await pool.execute(`SELECT COUNT(*) as count FROM employees WHERE status = 'active'`);
    const [presentToday] = await pool.execute(
      `SELECT COUNT(DISTINCT employee_id) as count FROM attendance WHERE attendance_date = ? AND status = 'present'`,
      [today]
    );
    const [lateToday] = await pool.execute(
      `SELECT COUNT(*) as count FROM attendance WHERE attendance_date = ? AND is_late = 1`,
      [today]
    );
    const [onLeave] = await pool.execute(
      `SELECT COUNT(*) as count FROM leaves WHERE status = 'approved' AND ? BETWEEN from_date AND to_date`,
      [today]
    );
    const [pendingLeaves] = await pool.execute(
      `SELECT COUNT(*) as count FROM leaves WHERE status = 'pending'`
    );

    const total = totalEmp[0].count;
    const present = presentToday[0].count;
    const absent = total - present - onLeave[0].count;

    // Department-wise attendance today
    const [deptStats] = await pool.execute(
      `SELECT d.name as department, COUNT(a.id) as present
       FROM departments d
       LEFT JOIN employees e ON e.department_id = d.id
       LEFT JOIN attendance a ON a.employee_id = e.id AND a.attendance_date = ? AND a.status = 'present'
       WHERE d.is_active = 1
       GROUP BY d.id, d.name`,
      [today]
    );

    return successResponse(res, {
      totalEmployees: total,
      presentToday: present,
      absentToday: Math.max(0, absent),
      onLeave: onLeave[0].count,
      lateToday: lateToday[0].count,
      pendingLeaves: pendingLeaves[0].count,
      attendancePercentage: total ? Math.round((present / total) * 100) : 0,
      departmentStats: deptStats,
    });
  } catch (err) {
    logger.error('Dashboard stats error:', err);
    return errorResponse(res, 'Failed to get dashboard stats', 500);
  }
};

// GET /api/attendance/admin/list (admin-level full list by date)
export const getAdminAttendanceList = async (req, res) => {
  try {
    const { date = todayDate(), page = 1, limit = 50, department_id, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = [`a.attendance_date = ?`];
    const params = [date];
    if (department_id) { conditions.push(`e.department_id = ?`); params.push(department_id); }
    if (status) { conditions.push(`a.status = ?`); params.push(status); }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM attendance a JOIN employees e ON e.id = a.employee_id ${where}`, params
    );

    const [rows] = await pool.execute(
      `SELECT a.*, e.first_name, e.last_name, e.employee_code, e.profile_image,
              d.name as department_name
       FROM attendance a
       JOIN employees e ON e.id = a.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       ${where}
       ORDER BY a.check_in_time ASC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    return paginatedResponse(res, rows, countRows[0].total, page, limit);
  } catch (err) {
    return errorResponse(res, 'Failed to get attendance list', 500);
  }
};

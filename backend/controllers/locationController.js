import pool from '../config/db.js';
import { successResponse, errorResponse } from '../utils/response.js';
import logger from '../config/logger.js';

// POST /api/location/track
export const trackLocation = async (req, res) => {
  try {
    const { latitude, longitude, accuracy, speed, heading, altitude } = req.body;
    const [empRows] = await pool.execute(
      `SELECT id FROM employees WHERE user_id = ? AND status = 'active'`,
      [req.user.id]
    );
    if (!empRows.length) return errorResponse(res, 'Employee not found', 404);

    await pool.execute(
      `INSERT INTO locations (employee_id, latitude, longitude, accuracy, speed, heading, altitude)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [empRows[0].id, latitude, longitude, accuracy || null, speed || null, heading || null, altitude || null]
    );

    return successResponse(res, {}, 'Location tracked');
  } catch (err) {
    return errorResponse(res, 'Location tracking failed', 500);
  }
};

// GET /api/location/live (Admin - all employees current location)
export const getLiveLocations = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT e.id, e.first_name, e.last_name, e.employee_code, e.profile_image,
              d.name as department,
              l.latitude, l.longitude, l.accuracy, l.recorded_at,
              a.status as attendance_status, a.check_in_time
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN (
         SELECT employee_id, MAX(id) as max_id FROM locations GROUP BY employee_id
       ) latest ON latest.employee_id = e.id
       LEFT JOIN locations l ON l.id = latest.max_id
       LEFT JOIN attendance a ON a.employee_id = e.id AND a.attendance_date = CURDATE()
       WHERE e.status = 'active'
       ORDER BY e.first_name`
    );
    return successResponse(res, rows);
  } catch (err) {
    logger.error('Get live locations error:', err);
    return errorResponse(res, 'Failed to get live locations', 500);
  }
};

// GET /api/location/history/:employeeId
export const getLocationHistory = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const [rows] = await pool.execute(
      `SELECT latitude, longitude, accuracy, speed, recorded_at
       FROM locations
       WHERE employee_id = ? AND DATE(recorded_at) = ?
       ORDER BY recorded_at ASC`,
      [employeeId, targetDate]
    );

    return successResponse(res, rows);
  } catch (err) {
    return errorResponse(res, 'Failed to get location history', 500);
  }
};

// GET /api/geofences
export const getGeofences = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT g.*, u.email as created_by_email
       FROM geofences g
       LEFT JOIN users u ON u.id = g.created_by
       ORDER BY g.created_at DESC`
    );
    return successResponse(res, rows);
  } catch (err) {
    return errorResponse(res, 'Failed to get geofences', 500);
  }
};

// POST /api/geofences
export const createGeofence = async (req, res) => {
  try {
    const { name, latitude, longitude, radius_meters, address } = req.body;
    const [result] = await pool.execute(
      `INSERT INTO geofences (name, latitude, longitude, radius_meters, address, created_by) VALUES (?, ?, ?, ?, ?, ?)`,
      [name, latitude, longitude, radius_meters || 100, address || null, req.user.id]
    );
    return successResponse(res, { id: result.insertId }, 'Geofence created', 201);
  } catch (err) {
    return errorResponse(res, 'Failed to create geofence', 500);
  }
};

// PUT /api/geofences/:id
export const updateGeofence = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, latitude, longitude, radius_meters, address, is_active } = req.body;
    const [result] = await pool.execute(
      `UPDATE geofences SET name=?, latitude=?, longitude=?, radius_meters=?, address=?, is_active=? WHERE id=?`,
      [name, latitude, longitude, radius_meters, address, is_active ?? 1, id]
    );
    if (!result.affectedRows) return errorResponse(res, 'Geofence not found', 404);
    return successResponse(res, {}, 'Geofence updated');
  } catch (err) {
    return errorResponse(res, 'Failed to update geofence', 500);
  }
};

// DELETE /api/geofences/:id
export const deleteGeofence = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute(`DELETE FROM geofences WHERE id = ?`, [id]);
    return successResponse(res, {}, 'Geofence deleted');
  } catch (err) {
    return errorResponse(res, 'Failed to delete geofence', 500);
  }
};

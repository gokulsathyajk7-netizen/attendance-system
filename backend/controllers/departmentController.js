import pool from '../config/db.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const getDepartments = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT d.*, COUNT(e.id) as employee_count,
              CONCAT(head.first_name, ' ', head.last_name) as head_name
       FROM departments d
       LEFT JOIN employees e ON e.department_id = d.id AND e.status = 'active'
       LEFT JOIN employees head ON head.id = d.head_id
       WHERE d.is_active = 1
       GROUP BY d.id
       ORDER BY d.name`
    );
    return successResponse(res, rows);
  } catch (err) {
    return errorResponse(res, 'Failed to get departments', 500);
  }
};

export const createDepartment = async (req, res) => {
  try {
    const { name, code, description, head_id } = req.body;
    const [result] = await pool.execute(
      `INSERT INTO departments (name, code, description, head_id) VALUES (?, ?, ?, ?)`,
      [name, code.toUpperCase(), description || null, head_id || null]
    );
    return successResponse(res, { id: result.insertId }, 'Department created', 201);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return errorResponse(res, 'Department code already exists', 409);
    return errorResponse(res, 'Failed to create department', 500);
  }
};

export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, head_id, is_active } = req.body;
    const [result] = await pool.execute(
      `UPDATE departments SET name=?, code=?, description=?, head_id=?, is_active=? WHERE id=?`,
      [name, code?.toUpperCase(), description, head_id || null, is_active ?? 1, id]
    );
    if (!result.affectedRows) return errorResponse(res, 'Department not found', 404);
    return successResponse(res, {}, 'Department updated');
  } catch (err) {
    return errorResponse(res, 'Failed to update department', 500);
  }
};

export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const [empCheck] = await pool.execute(
      `SELECT COUNT(*) as cnt FROM employees WHERE department_id = ? AND status = 'active'`, [id]
    );
    if (empCheck[0].cnt > 0) {
      return errorResponse(res, 'Cannot delete department with active employees', 400);
    }
    await pool.execute(`UPDATE departments SET is_active = 0 WHERE id = ?`, [id]);
    return successResponse(res, {}, 'Department deleted');
  } catch (err) {
    return errorResponse(res, 'Failed to delete department', 500);
  }
};

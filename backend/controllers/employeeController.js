import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js';
import { sendEmail } from '../services/emailService.js';
import { createNotification } from '../services/notificationService.js';
import logger from '../config/logger.js';
import path from 'path';
import fs from 'fs';

// GET /api/employees
export const getEmployees = async (req, res) => {
  try {
    const {
      page = 1, limit = 20, search = '', department_id, status, role
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];

    if (search) {
      conditions.push(`(e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ? OR u.email LIKE ? OR e.mobile LIKE ?)`);
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }
    if (department_id) { conditions.push(`e.department_id = ?`); params.push(department_id); }
    if (status) { conditions.push(`e.status = ?`); params.push(status); }
    if (role) { conditions.push(`u.role = ?`); params.push(role); }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM employees e JOIN users u ON u.id = e.user_id ${whereClause}`,
      params
    );

    const [rows] = await pool.execute(
      `SELECT e.*, u.email, u.role, u.is_active, u.last_login,
              d.name as department_name, d.code as department_code,
              CONCAT(m.first_name, ' ', m.last_name) as manager_name
       FROM employees e
       JOIN users u ON u.id = e.user_id
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN employees m ON m.id = e.manager_id
       ${whereClause}
       ORDER BY e.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    return paginatedResponse(res, rows, countRows[0].total, page, limit, 'Employees fetched');
  } catch (err) {
    logger.error('Get employees error:', err);
    return errorResponse(res, 'Failed to fetch employees', 500);
  }
};

// GET /api/employees/:id
export const getEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      `SELECT e.*, u.email, u.role, u.is_active, u.last_login,
              d.name as department_name,
              CONCAT(m.first_name, ' ', m.last_name) as manager_name
       FROM employees e
       JOIN users u ON u.id = e.user_id
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN employees m ON m.id = e.manager_id
       WHERE e.id = ?`,
      [id]
    );
    if (!rows.length) return errorResponse(res, 'Employee not found', 404);
    return successResponse(res, rows[0]);
  } catch (err) {
    return errorResponse(res, 'Failed to fetch employee', 500);
  }
};

// POST /api/employees
export const createEmployee = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const {
      email, first_name, last_name, mobile, department_id,
      designation, salary, joining_date, role = 'employee',
      manager_id, address, emergency_contact
    } = req.body;

    // Generate temp password
    const tempPassword = `Temp@${Math.random().toString(36).slice(2, 8)}`;
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const [userResult] = await conn.execute(
      `INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)`,
      [email.toLowerCase().trim(), passwordHash, role]
    );

    const userId = userResult.insertId;

    // Generate employee code
    const [codeRow] = await conn.execute(`SELECT COUNT(*) as cnt FROM employees`);
    const empCode = `EMP${String(codeRow[0].cnt + 1).padStart(4, '0')}`;

    const profileImage = req.file ? `profiles/${req.file.filename}` : null;

    const [empResult] = await conn.execute(
      `INSERT INTO employees (user_id, employee_code, first_name, last_name, mobile, department_id, designation, salary, joining_date, profile_image, manager_id, address, emergency_contact)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, empCode, first_name, last_name, mobile, department_id, designation, salary || 0, joining_date, profileImage, manager_id || null, address || null, emergency_contact || null]
    );

    // Initialize leave balances for current year
    const currentYear = new Date().getFullYear();
    const [leaveTypes] = await conn.execute(`SELECT id, max_days_per_year FROM leave_types WHERE is_active = 1`);
    for (const lt of leaveTypes) {
      await conn.execute(
        `INSERT INTO leave_balances (employee_id, leave_type_id, year, allocated_days, remaining_days) VALUES (?, ?, ?, ?, ?)`,
        [empResult.insertId, lt.id, currentYear, lt.max_days_per_year, lt.max_days_per_year]
      );
    }

    await conn.commit();

    // Send welcome email (non-blocking)
    sendEmail(email, 'welcomeEmployee', first_name, email, tempPassword).catch(() => {});

    await createNotification(userId, 'Welcome!', `Your employee account has been created. Employee Code: ${empCode}`, 'success');

    return successResponse(res, { employeeId: empResult.insertId, employeeCode: empCode }, 'Employee created successfully', 201);
  } catch (err) {
    await conn.rollback();
    logger.error('Create employee error:', err);
    if (err.code === 'ER_DUP_ENTRY') return errorResponse(res, 'Email already registered', 409);
    return errorResponse(res, 'Failed to create employee', 500);
  } finally {
    conn.release();
  }
};

// PUT /api/employees/:id
export const updateEmployee = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const {
      first_name, last_name, mobile, department_id, designation,
      salary, joining_date, role, manager_id, address, emergency_contact, status
    } = req.body;

    const [empRows] = await conn.execute(`SELECT user_id, profile_image FROM employees WHERE id = ?`, [id]);
    if (!empRows.length) return errorResponse(res, 'Employee not found', 404);

    let profileImage = empRows[0].profile_image;
    if (req.file) {
      // Delete old image
      if (profileImage) {
        const oldPath = path.join(process.cwd(), 'uploads', profileImage);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      profileImage = `profiles/${req.file.filename}`;
    }

    await conn.execute(
      `UPDATE employees SET first_name=?, last_name=?, mobile=?, department_id=?, designation=?, salary=?, joining_date=?, profile_image=?, manager_id=?, address=?, emergency_contact=?, status=?
       WHERE id = ?`,
      [first_name, last_name, mobile, department_id, designation, salary, joining_date, profileImage, manager_id || null, address || null, emergency_contact || null, status || 'active', id]
    );

    if (role) {
      await conn.execute(`UPDATE users SET role = ? WHERE id = ?`, [role, empRows[0].user_id]);
    }

    await conn.commit();
    return successResponse(res, {}, 'Employee updated successfully');
  } catch (err) {
    await conn.rollback();
    logger.error('Update employee error:', err);
    return errorResponse(res, 'Failed to update employee', 500);
  } finally {
    conn.release();
  }
};

// DELETE /api/employees/:id
export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(`SELECT user_id FROM employees WHERE id = ?`, [id]);
    if (!rows.length) return errorResponse(res, 'Employee not found', 404);

    await pool.execute(`DELETE FROM users WHERE id = ?`, [rows[0].user_id]);
    return successResponse(res, {}, 'Employee deleted successfully');
  } catch (err) {
    logger.error('Delete employee error:', err);
    return errorResponse(res, 'Failed to delete employee', 500);
  }
};

// PATCH /api/employees/:id/status
export const updateEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return errorResponse(res, 'Invalid status', 400);
    }

    const [rows] = await pool.execute(`SELECT user_id FROM employees WHERE id = ?`, [id]);
    if (!rows.length) return errorResponse(res, 'Employee not found', 404);

    await pool.execute(`UPDATE employees SET status = ? WHERE id = ?`, [status, id]);

    const isActive = status === 'active' ? 1 : 0;
    await pool.execute(`UPDATE users SET is_active = ? WHERE id = ?`, [isActive, rows[0].user_id]);

    return successResponse(res, {}, `Employee ${status}`);
  } catch (err) {
    return errorResponse(res, 'Failed to update status', 500);
  }
};

// POST /api/employees/self-register-request (public, no auth — mobile "Register" screen)
export const selfRegisterRequest = async (req, res) => {
  try {
    const { first_name, last_name, email, mobile } = req.body;
    if (!first_name || !email || !mobile) {
      return errorResponse(res, 'first_name, email and mobile are required', 400);
    }

    const [existingUser] = await pool.execute(`SELECT id FROM users WHERE email = ?`, [email.toLowerCase().trim()]);
    if (existingUser.length) return errorResponse(res, 'An account with this email already exists', 409);

    const [existingReq] = await pool.execute(
      `SELECT id FROM registration_requests WHERE email = ? AND status = 'pending'`,
      [email.toLowerCase().trim()]
    );
    if (existingReq.length) return errorResponse(res, 'A request for this email is already pending', 409);

    await pool.execute(
      `INSERT INTO registration_requests (first_name, last_name, email, mobile) VALUES (?, ?, ?, ?)`,
      [first_name, last_name || null, email.toLowerCase().trim(), mobile]
    );

    await notifyAdmins('New Registration Request', `${first_name} ${last_name || ''} (${email}) requested an employee account.`, 'info');

    return successResponse(res, {}, 'Request submitted. An admin will review and create your account.', 201);
  } catch (err) {
    logger.error('Self register request error:', err);
    return errorResponse(res, 'Failed to submit request', 500);
  }
};

// GET /api/employees/registration-requests (admin)
export const getRegistrationRequests = async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const [rows] = await pool.execute(
      `SELECT * FROM registration_requests WHERE status = ? ORDER BY created_at DESC`,
      [status]
    );
    return successResponse(res, rows);
  } catch (err) {
    return errorResponse(res, 'Failed to fetch registration requests', 500);
  }
};

// PUT /api/employees/registration-requests/:id (admin: approve/reject)
export const reviewRegistrationRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' | 'rejected'
    if (!['approved', 'rejected'].includes(status)) return errorResponse(res, 'Invalid status', 400);

    const [rows] = await pool.execute(`SELECT * FROM registration_requests WHERE id = ?`, [id]);
    if (!rows.length) return errorResponse(res, 'Request not found', 404);
    if (rows[0].status !== 'pending') return errorResponse(res, `Request already ${rows[0].status}`, 400);

    await pool.execute(
      `UPDATE registration_requests SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?`,
      [status, req.user.id, id]
    );

    // Note: on approval, admin still completes onboarding via POST /api/employees
    // (department, designation, salary, role are required and not collected from the mobile request).
    return successResponse(res, { request: rows[0] }, `Request ${status}. ${status === 'approved' ? 'Use Add Employee to finish onboarding.' : ''}`);
  } catch (err) {
    return errorResponse(res, 'Failed to review request', 500);
  }
};
// GET /api/employees/export/csv
export const exportEmployeesCSV = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT e.employee_code, e.first_name, e.last_name, u.email, e.mobile,
              d.name as department, e.designation, e.salary, e.joining_date, e.status
       FROM employees e
       JOIN users u ON u.id = e.user_id
       LEFT JOIN departments d ON d.id = e.department_id
       ORDER BY e.employee_code`
    );

    const headers = ['Employee Code', 'First Name', 'Last Name', 'Email', 'Mobile', 'Department', 'Designation', 'Salary', 'Joining Date', 'Status'];
    const csvRows = [headers.join(',')];

    for (const row of rows) {
      csvRows.push([
        row.employee_code, row.first_name, row.last_name, row.email,
        row.mobile, row.department, row.designation, row.salary,
        row.joining_date, row.status
      ].map(v => `"${v ?? ''}"`).join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=employees_${Date.now()}.csv`);
    res.send(csvRows.join('\n'));
  } catch (err) {
    return errorResponse(res, 'CSV export failed', 500);
  }
};

import pool from '../config/db.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { minutesToHHMM } from '../utils/geofence.js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import logger from '../config/logger.js';

// GET /api/reports/daily
export const getDailyReport = async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.query;

    const [rows] = await pool.execute(
      `SELECT e.employee_code, e.first_name, e.last_name, d.name as department,
              a.status, a.check_in_time, a.check_out_time, a.total_working_minutes,
              a.overtime_minutes, a.is_late, a.late_by_minutes, a.break_duration_minutes
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN attendance a ON a.employee_id = e.id AND a.attendance_date = ?
       WHERE e.status = 'active'
       ORDER BY d.name, e.first_name`,
      [date]
    );

    const summary = {
      date,
      total: rows.length,
      present: rows.filter(r => r.status === 'present').length,
      absent: rows.filter(r => !r.status || r.status === 'absent').length,
      late: rows.filter(r => r.is_late).length,
      onLeave: rows.filter(r => r.status === 'leave').length,
      halfDay: rows.filter(r => r.status === 'half_day').length,
    };

    return successResponse(res, { summary, records: rows });
  } catch (err) {
    logger.error('Daily report error:', err);
    return errorResponse(res, 'Failed to generate daily report', 500);
  }
};

// GET /api/reports/monthly
export const getMonthlyReport = async (req, res) => {
  try {
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear(), department_id, employee_id } = req.query;

    const conditions = [`MONTH(a.attendance_date) = ? AND YEAR(a.attendance_date) = ?`];
    const params = [month, year];

    if (department_id) { conditions.push(`e.department_id = ?`); params.push(department_id); }
    if (employee_id) { conditions.push(`e.id = ?`); params.push(employee_id); }

    const [rows] = await pool.execute(
      `SELECT e.id, e.employee_code, e.first_name, e.last_name, d.name as department,
              COUNT(*) as working_days,
              SUM(a.status = 'present') as present,
              SUM(a.status = 'absent') as absent,
              SUM(a.status = 'half_day') as half_day,
              SUM(a.status = 'leave') as leave,
              SUM(a.is_late = 1) as late_count,
              SUM(a.total_working_minutes) as total_minutes,
              SUM(a.overtime_minutes) as overtime_minutes,
              ROUND(SUM(a.status = 'present') / COUNT(*) * 100, 1) as attendance_pct
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN attendance a ON a.employee_id = e.id AND ${conditions.join(' AND ')}
       WHERE e.status = 'active'
       GROUP BY e.id, e.employee_code, e.first_name, e.last_name, d.name
       ORDER BY d.name, e.first_name`,
      params
    );

    return successResponse(res, rows.map(r => ({
      ...r,
      total_hours: minutesToHHMM(r.total_minutes || 0),
      overtime_hours: minutesToHHMM(r.overtime_minutes || 0),
    })));
  } catch (err) {
    logger.error('Monthly report error:', err);
    return errorResponse(res, 'Failed to generate monthly report', 500);
  }
};

// GET /api/reports/department
export const getDepartmentReport = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const start = from_date || new Date(new Date().setDate(1)).toISOString().split('T')[0];
    const end = to_date || new Date().toISOString().split('T')[0];

    const [rows] = await pool.execute(
      `SELECT d.name as department, d.code,
              COUNT(DISTINCT e.id) as total_employees,
              COUNT(a.id) as total_records,
              SUM(a.status = 'present') as present_count,
              SUM(a.status = 'absent') as absent_count,
              SUM(a.is_late = 1) as late_count,
              ROUND(AVG(a.total_working_minutes), 0) as avg_working_minutes,
              ROUND(SUM(a.status = 'present') / NULLIF(COUNT(a.id),0) * 100, 1) as attendance_pct
       FROM departments d
       LEFT JOIN employees e ON e.department_id = d.id AND e.status = 'active'
       LEFT JOIN attendance a ON a.employee_id = e.id AND a.attendance_date BETWEEN ? AND ?
       WHERE d.is_active = 1
       GROUP BY d.id, d.name, d.code
       ORDER BY d.name`,
      [start, end]
    );

    return successResponse(res, rows.map(r => ({
      ...r,
      avg_working_hours: minutesToHHMM(r.avg_working_minutes || 0),
    })));
  } catch (err) {
    return errorResponse(res, 'Failed to generate department report', 500);
  }
};

// GET /api/reports/export/excel
export const exportExcel = async (req, res) => {
  try {
    const { type = 'daily', date, month, year } = req.query;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Attendance System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Attendance Report', {
      pageSetup: { paperSize: 9, orientation: 'landscape' },
    });

    // Header styling
    const headerStyle = {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } },
      font: { color: { argb: 'FFFFFFFF' }, bold: true },
      alignment: { horizontal: 'center' },
      border: { bottom: { style: 'thin' } },
    };

    if (type === 'daily') {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const [rows] = await pool.execute(
        `SELECT e.employee_code, e.first_name, e.last_name, d.name as department,
                COALESCE(a.status, 'absent') as status,
                a.check_in_time, a.check_out_time, a.total_working_minutes,
                a.is_late, a.late_by_minutes
         FROM employees e
         LEFT JOIN departments d ON d.id = e.department_id
         LEFT JOIN attendance a ON a.employee_id = e.id AND a.attendance_date = ?
         WHERE e.status = 'active' ORDER BY d.name, e.first_name`,
        [targetDate]
      );

      sheet.columns = [
        { header: 'Emp Code', key: 'code', width: 12 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Department', key: 'dept', width: 18 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Check In', key: 'in', width: 18 },
        { header: 'Check Out', key: 'out', width: 18 },
        { header: 'Working Hours', key: 'hours', width: 15 },
        { header: 'Late', key: 'late', width: 8 },
        { header: 'Late By (min)', key: 'lateBy', width: 14 },
      ];

      sheet.getRow(1).eachCell(cell => Object.assign(cell, headerStyle));

      for (const r of rows) {
        sheet.addRow({
          code: r.employee_code,
          name: `${r.first_name} ${r.last_name}`,
          dept: r.department,
          status: r.status,
          in: r.check_in_time || '-',
          out: r.check_out_time || '-',
          hours: minutesToHHMM(r.total_working_minutes || 0),
          late: r.is_late ? 'Yes' : 'No',
          lateBy: r.late_by_minutes || 0,
        });
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=report_${type}_${Date.now()}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    logger.error('Excel export error:', err);
    return errorResponse(res, 'Excel export failed', 500);
  }
};

// GET /api/reports/export/pdf
export const exportPDF = async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.query;
    const [rows] = await pool.execute(
      `SELECT e.employee_code, e.first_name, e.last_name, d.name as department,
              COALESCE(a.status, 'absent') as status, a.check_in_time, a.check_out_time,
              a.total_working_minutes, a.is_late
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN attendance a ON a.employee_id = e.id AND a.attendance_date = ?
       WHERE e.status = 'active' ORDER BY e.first_name`,
      [date]
    );

    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=daily_report_${date}.pdf`);
    doc.pipe(res);

    // Title
    doc.fontSize(18).fillColor('#1976D2').text(`Daily Attendance Report - ${date}`, { align: 'center' });
    doc.moveDown(0.5);

    // Summary
    const present = rows.filter(r => r.status === 'present').length;
    const absent = rows.filter(r => r.status === 'absent').length;
    doc.fontSize(10).fillColor('#333333')
      .text(`Total: ${rows.length}  |  Present: ${present}  |  Absent: ${absent}  |  Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown();

    // Table header
    const startX = 40;
    let y = doc.y;
    const colWidths = [70, 130, 100, 70, 90, 90, 80, 40];
    const headers = ['Emp Code', 'Name', 'Department', 'Status', 'Check In', 'Check Out', 'Hours', 'Late'];

    doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), 20).fill('#1976D2');
    doc.fillColor('#FFFFFF').fontSize(9);
    let x = startX;
    headers.forEach((h, i) => {
      doc.text(h, x + 3, y + 5, { width: colWidths[i] - 6, align: 'center' });
      x += colWidths[i];
    });

    y += 20;
    doc.fillColor('#333333');
    rows.forEach((r, idx) => {
      if (y > 520) { doc.addPage({ layout: 'landscape' }); y = 40; }
      if (idx % 2 === 0) doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), 18).fill('#F5F5F5');
      doc.fillColor('#333333').fontSize(8);
      x = startX;
      const cols = [
        r.employee_code,
        `${r.first_name} ${r.last_name}`,
        r.department || '-',
        r.status,
        r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString() : '-',
        r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : '-',
        minutesToHHMM(r.total_working_minutes || 0),
        r.is_late ? 'Yes' : 'No',
      ];
      cols.forEach((c, i) => {
        doc.text(String(c), x + 3, y + 4, { width: colWidths[i] - 6, align: 'center' });
        x += colWidths[i];
      });
      y += 18;
    });

    doc.end();
  } catch (err) {
    logger.error('PDF export error:', err);
    return errorResponse(res, 'PDF export failed', 500);
  }
};

// GET /api/reports/notifications
export const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [rows] = await pool.execute(
      `SELECT * FROM notifications WHERE user_id = ?
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [req.user.id, parseInt(limit), offset]
    );

    const [unread] = await pool.execute(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`,
      [req.user.id]
    );

    await pool.execute(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`,
      [req.user.id]
    );

    return successResponse(res, { notifications: rows, unreadCount: unread[0].count });
  } catch (err) {
    return errorResponse(res, 'Failed to get notifications', 500);
  }
};

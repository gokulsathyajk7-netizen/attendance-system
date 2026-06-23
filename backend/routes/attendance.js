import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  checkIn, checkOut, toggleBreak, getTodayAttendance,
  getAttendanceHistory, getAttendanceSummary, getDashboardStats, getAdminAttendanceList
} from '../controllers/attendanceController.js';

const router = Router();
router.use(authenticate);

// Employee routes
router.post('/checkin', checkIn);
router.post('/checkout', checkOut);
router.post('/break', toggleBreak);
router.get('/today', getTodayAttendance);
router.get('/history', getAttendanceHistory);
router.get('/summary', getAttendanceSummary);

// Admin routes
router.get('/dashboard', authorize('super_admin', 'admin', 'manager'), getDashboardStats);
router.get('/admin/list', authorize('super_admin', 'admin', 'manager'), getAdminAttendanceList);

export default router;

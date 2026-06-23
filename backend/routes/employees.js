import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  getEmployees, getEmployee, createEmployee, updateEmployee,
  deleteEmployee, updateEmployeeStatus, exportEmployeesCSV,
  selfRegisterRequest, getRegistrationRequests, reviewRegistrationRequest
} from '../controllers/employeeController.js';

const router = Router();
const adminRoles = ['super_admin', 'admin'];

// Public route (no auth) — mobile app "Register" screen submits a request here
router.post('/self-register-request', selfRegisterRequest);

router.use(authenticate);

router.get('/', authorize('super_admin', 'admin', 'manager'), getEmployees);
router.get('/export/csv', authorize(...adminRoles), exportEmployeesCSV);
router.get('/registration-requests', authorize(...adminRoles), getRegistrationRequests);
router.put('/registration-requests/:id', authorize(...adminRoles), reviewRegistrationRequest);
router.get('/:id', getEmployee);
router.post('/', authorize(...adminRoles), upload.single('profile_image'), createEmployee);
router.put('/:id', authorize(...adminRoles), upload.single('profile_image'), updateEmployee);
router.delete('/:id', authorize('super_admin'), deleteEmployee);
router.patch('/:id/status', authorize(...adminRoles), updateEmployeeStatus);

export default router;


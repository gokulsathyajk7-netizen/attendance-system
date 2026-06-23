// leaves.js
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  applyLeave, getLeaves, reviewLeave, cancelLeave, getLeaveBalance, getLeaveTypes
} from '../controllers/leaveController.js';

const leavesRouter = Router();
leavesRouter.use(authenticate);
leavesRouter.get('/types', getLeaveTypes);
leavesRouter.get('/balance', getLeaveBalance);
leavesRouter.get('/', getLeaves);
leavesRouter.post('/', upload.single('attachment'), applyLeave);
leavesRouter.put('/:id', authorize('super_admin', 'admin', 'manager'), reviewLeave);
leavesRouter.delete('/:id', cancelLeave);

export { leavesRouter };

// ============================================================
// locations.js
import { Router as LocationRouter } from 'express';
import { authenticate as authMw, authorize as authzMw } from '../middleware/auth.js';
import {
  trackLocation, getLiveLocations, getLocationHistory,
  getGeofences, createGeofence, updateGeofence, deleteGeofence
} from '../controllers/locationController.js';

const locationRouter = LocationRouter();
locationRouter.use(authMw);

locationRouter.post('/track', trackLocation);
locationRouter.get('/live', authzMw('super_admin', 'admin', 'manager'), getLiveLocations);
locationRouter.get('/history/:employeeId', authzMw('super_admin', 'admin', 'manager'), getLocationHistory);

locationRouter.get('/geofences', getGeofences);
locationRouter.post('/geofences', authzMw('super_admin', 'admin'), createGeofence);
locationRouter.put('/geofences/:id', authzMw('super_admin', 'admin'), updateGeofence);
locationRouter.delete('/geofences/:id', authzMw('super_admin', 'admin'), deleteGeofence);

export { locationRouter };

// ============================================================
// departments.js
import { Router as DeptRouter } from 'express';
import { authenticate as authMwD, authorize as authzMwD } from '../middleware/auth.js';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../controllers/departmentController.js';

const deptRouter = DeptRouter();
deptRouter.use(authMwD);
deptRouter.get('/', getDepartments);
deptRouter.post('/', authzMwD('super_admin', 'admin'), createDepartment);
deptRouter.put('/:id', authzMwD('super_admin', 'admin'), updateDepartment);
deptRouter.delete('/:id', authzMwD('super_admin'), deleteDepartment);

export { deptRouter };

// ============================================================
// reports.js
import { Router as RptRouter } from 'express';
import { authenticate as authMwR, authorize as authzMwR } from '../middleware/auth.js';
import {
  getDailyReport, getMonthlyReport, getDepartmentReport,
  exportExcel, exportPDF, getNotifications
} from '../controllers/reportController.js';

const reportsRouter = RptRouter();
reportsRouter.use(authMwR);

reportsRouter.get('/daily', authzMwR('super_admin', 'admin', 'manager'), getDailyReport);
reportsRouter.get('/monthly', authzMwR('super_admin', 'admin', 'manager'), getMonthlyReport);
reportsRouter.get('/department', authzMwR('super_admin', 'admin', 'manager'), getDepartmentReport);
reportsRouter.get('/export/excel', authzMwR('super_admin', 'admin', 'manager'), exportExcel);
reportsRouter.get('/export/pdf', authzMwR('super_admin', 'admin', 'manager'), exportPDF);
reportsRouter.get('/notifications', getNotifications);

export { reportsRouter };

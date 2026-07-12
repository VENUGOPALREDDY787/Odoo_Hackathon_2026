import { Router } from 'express';
import authRouter from './modules/auth/routes/auth.routes';
import departmentRouter from './modules/department/routes/department.routes';
import categoryRouter from './modules/asset-category/routes/category.routes';
import employeeRouter from './modules/employee/routes/employee.routes';
import assetRouter from './modules/asset/routes/asset.routes';
import allocationRouter from './modules/allocation/routes/allocation.routes';
import transferRouter from './modules/allocation/routes/transfer.routes';
import bookingRouter from './modules/booking/routes/booking.routes';
import maintenanceRouter from './modules/maintenance/routes/maintenance.routes';
import auditRouter from './modules/audit/routes/audit.routes';
import notificationRouter from './modules/notification/routes/notification.routes';
import activityLogRouter from './modules/activity-log/routes/activity-log.routes';
import dashboardRouter from './modules/dashboard/routes/dashboard.routes';

const router = Router();

// Mount TS modules
router.use('/auth', authRouter);
router.use('/departments', departmentRouter);
router.use('/categories', categoryRouter);
router.use('/employees', employeeRouter);
router.use('/assets', assetRouter);
router.use('/allocations', allocationRouter);
router.use('/transfers', transferRouter);
router.use('/bookings', bookingRouter);
router.use('/maintenance', maintenanceRouter);
router.use('/audit', auditRouter);
router.use('/notifications', notificationRouter);
router.use('/activity-logs', activityLogRouter);
router.use('/dashboard', dashboardRouter);

export default router;

import { Router } from 'express';
import { ReportsController } from '../controller/reports.controller';
import { authenticate, requireRole } from '../../../middleware/auth';
import { asyncHandler } from '../../../utils/asyncHandler';

const router = Router();
const controller = new ReportsController();

const ALL_ROLES = ['Admin', 'Asset Manager', 'Department Head', 'Employee'];
const MANAGER_ROLES = ['Admin', 'Asset Manager', 'Department Head'];
const ADMIN_ROLES = ['Admin'];

// ─── Operational & Executive Reports ──────────────────────────────────────────

router.get('/utilization',
  authenticate,
  requireRole(ALL_ROLES),
  asyncHandler(controller.getAssetUtilization)
);

router.get('/department-allocation',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.getDepartmentAllocation)
);

router.get('/employee-allocation',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.getEmployeeAllocation)
);

router.get('/maintenance-frequency',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.getMaintenanceFrequency)
);

router.get('/maintenance-cost',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.getMaintenanceCost)
);

router.get('/asset-lifecycle',
  authenticate,
  requireRole(ALL_ROLES),
  asyncHandler(controller.getAssetLifecycle)
);

router.get('/booking-utilization',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.getBookingUtilization)
);

router.get('/booking-heatmap',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.getBookingHeatmap)
);

router.get('/asset-age',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.getAssetAge)
);

router.get('/warranty-expiry',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.getWarrantyExpiry)
);

router.get('/maintenance-due',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.getMaintenanceDue)
);

router.get('/retirement-forecast',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.getRetirementForecast)
);

router.get('/audit-summary',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.getAuditSummary)
);

router.get('/missing-assets',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.getMissingAsset)
);

router.get('/damaged-assets',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.getDamagedAsset)
);

router.get('/discrepancies',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.getDiscrepancy)
);

router.get('/asset-movement',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.getAssetMovement)
);

router.get('/activity-report',
  authenticate,
  requireRole(ADMIN_ROLES),
  asyncHandler(controller.getActivity)
);

router.get('/notification-report',
  authenticate,
  requireRole(ADMIN_ROLES),
  asyncHandler(controller.getNotification)
);

router.get('/dashboard-summary',
  authenticate,
  requireRole(ALL_ROLES),
  asyncHandler(controller.getDashboardSummary)
);

// ─── Analytics Summary ──────────────────────────────────────────────────────

router.get('/analytics',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.getAnalyticsSummary)
);

export default router;

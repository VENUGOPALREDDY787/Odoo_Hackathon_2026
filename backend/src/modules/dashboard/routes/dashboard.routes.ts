import { Router } from 'express';
import { DashboardController } from '../controller/dashboard.controller';
import { authenticate, requireRole } from '../../../middleware/auth';
import { asyncHandler } from '../../../utils/asyncHandler';

const router = Router();
const controller = new DashboardController();

const ALL_ROLES = ['Admin', 'Asset Manager', 'Department Head', 'Employee'];
const MANAGER_ROLES = ['Admin', 'Asset Manager', 'Department Head'];

// ─── Summary & KPIs (All authenticated users) ──────────────────────────────────
router.get('/summary',
  authenticate,
  requireRole(ALL_ROLES),
  asyncHandler(controller.getSummary)
);

router.get('/kpis',
  authenticate,
  requireRole(ALL_ROLES),
  asyncHandler(controller.getKPIs)
);

// ─── Analytics & Reports (Managers only) ───────────────────────────────────────
router.get('/category-distribution',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.getCategoryDistribution)
);

router.get('/department-distribution',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.getDepartmentDistribution)
);

router.get('/utilization',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.getAssetUtilization)
);

router.get('/booking-heatmap',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.getBookingHeatmap)
);

router.get('/maintenance-frequency',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.getMaintenanceFrequency)
);

router.get('/retirement-due',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.getRetirementDue)
);

router.get('/department-allocations',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.getDepartmentAllocations)
);

router.get('/maintenance-cost-trend',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.getMaintenanceCostTrend)
);

router.get('/audit-trend',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.getAuditTrend)
);

export default router;

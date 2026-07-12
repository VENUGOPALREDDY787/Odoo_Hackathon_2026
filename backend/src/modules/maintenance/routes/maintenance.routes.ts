import { Router } from 'express';
import { MaintenanceController } from '../controller/maintenance.controller';
import { authenticate, requireRole } from '../../../middleware/auth';
import { asyncHandler } from '../../../utils/asyncHandler';

/**
 * maintenance.routes.ts — Express router for the Maintenance Management module.
 *
 * RBAC Matrix:
 *   Raise/View own          → Employee, Dept Head, Asset Manager, Admin
 *   Update (own/pending)    → Employee (own), Asset Manager, Admin
 *   Approve/Reject          → Asset Manager, Admin
 *   Assign Technician       → Asset Manager, Admin
 *   Start/Complete/Close    → Asset Manager, Admin
 *   Cancel                  → Employee (own), Asset Manager, Admin
 *   Reports                 → Asset Manager, Admin
 */
const router = Router();
const controller = new MaintenanceController();

const MANAGER_ROLES = ['Admin', 'Asset Manager'];

// ─── Reports (before :id to avoid collision) ─────────────────────────────────
router.get('/report',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.getReport)
);

// ─── CRUD ─────────────────────────────────────────────────────────────────────
router.post('/', authenticate, asyncHandler(controller.createRequest));
router.get('/', authenticate, asyncHandler(controller.listRequests));
router.get('/:id', authenticate, asyncHandler(controller.getRequest));
router.put('/:id', authenticate, asyncHandler(controller.updateRequest));

// ─── Workflow Transitions ─────────────────────────────────────────────────────
router.put('/:id/approve',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.approveRequest)
);

router.put('/:id/reject',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.rejectRequest)
);

router.put('/:id/assign-technician',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.assignTechnician)
);

router.put('/:id/start',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.startMaintenance)
);

router.put('/:id/complete',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.completeMaintenance)
);

router.put('/:id/close',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.closeRequest)
);

router.put('/:id/cancel',
  authenticate,
  asyncHandler(controller.cancelRequest)
);

export default router;

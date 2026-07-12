import { Router } from 'express';
import { AuditController } from '../controller/audit.controller';
import { authenticate, requireRole } from '../../../middleware/auth';
import { asyncHandler } from '../../../utils/asyncHandler';

/**
 * audit.routes.ts — Express router for the Audit Management module.
 *
 * RBAC Matrix:
 *   Create/Update/Delete/Assign     → Admin, Asset Manager
 *   Schedule/Start/Complete/Close   → Admin, Asset Manager
 *   Cancel                          → Admin, Asset Manager
 *   Verify Assets / Add Evidence    → Admin, Asset Manager, Employee (assigned auditors only — enforced in service)
 *   List / Read / Report            → Admin, Asset Manager, Department Head, Employee
 *   Dashboard                       → Admin, Asset Manager
 */
const router = Router();
const controller = new AuditController();

const MANAGER_ROLES = ['Admin', 'Asset Manager'];
const ALL_ROLES = ['Admin', 'Asset Manager', 'Department Head', 'Employee'];

// ─── Dashboard (before /:id) ─────────────────────────────────────────────────
router.get('/dashboard',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.getDashboard)
);

// ─── Cycle CRUD ───────────────────────────────────────────────────────────────
router.post('/', authenticate, requireRole(MANAGER_ROLES), asyncHandler(controller.createCycle));
router.get('/', authenticate, requireRole(ALL_ROLES), asyncHandler(controller.listCycles));
router.get('/:id', authenticate, requireRole(ALL_ROLES), asyncHandler(controller.getCycle));
router.put('/:id', authenticate, requireRole(MANAGER_ROLES), asyncHandler(controller.updateCycle));
router.delete('/:id', authenticate, requireRole(MANAGER_ROLES), asyncHandler(controller.deleteCycle));

// ─── Workflow Transitions ─────────────────────────────────────────────────────
router.put('/:id/assign-auditors',
  authenticate, requireRole(MANAGER_ROLES), asyncHandler(controller.assignAuditors)
);
router.put('/:id/schedule',
  authenticate, requireRole(MANAGER_ROLES), asyncHandler(controller.scheduleCycle)
);
router.put('/:id/start',
  authenticate, requireRole(MANAGER_ROLES), asyncHandler(controller.startCycle)
);
router.put('/:id/complete',
  authenticate, requireRole(MANAGER_ROLES), asyncHandler(controller.completeCycle)
);
router.put('/:id/close',
  authenticate, requireRole(MANAGER_ROLES), asyncHandler(controller.closeCycle)
);
router.put('/:id/cancel',
  authenticate, requireRole(MANAGER_ROLES), asyncHandler(controller.cancelCycle)
);

// ─── Verification (all authenticated — service enforces auditor assignment) ──
router.get('/:id/items',
  authenticate, requireRole(ALL_ROLES), asyncHandler(controller.listItems)
);
router.post('/:id/verify/:assetId',
  authenticate, asyncHandler(controller.verifyAsset)
);
router.post('/:id/evidence/:assetId',
  authenticate, asyncHandler(controller.addEvidence)
);

// ─── Reports ──────────────────────────────────────────────────────────────────
router.get('/:id/discrepancies',
  authenticate, requireRole(MANAGER_ROLES), asyncHandler(controller.getDiscrepancies)
);
router.get('/:id/report',
  authenticate, requireRole(MANAGER_ROLES), asyncHandler(controller.getReport)
);

export default router;

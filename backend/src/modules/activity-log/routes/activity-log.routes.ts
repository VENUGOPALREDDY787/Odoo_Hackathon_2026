import { Router } from 'express';
import { ActivityLogController } from '../controller/activity-log.controller';
import { authenticate, requireRole } from '../../../middleware/auth';
import { asyncHandler } from '../../../utils/asyncHandler';

const router = Router();
const controller = new ActivityLogController();

const ADMIN_ROLES = ['Admin'];

// Central Activity Logs endpoints — strictly Admin restricted
router.get('/',
  authenticate,
  requireRole(ADMIN_ROLES),
  asyncHandler(controller.listLogs)
);

router.get('/export',
  authenticate,
  requireRole(ADMIN_ROLES),
  asyncHandler(controller.exportLogs)
);

router.get('/:id',
  authenticate,
  requireRole(ADMIN_ROLES),
  asyncHandler(controller.getLog)
);

export default router;

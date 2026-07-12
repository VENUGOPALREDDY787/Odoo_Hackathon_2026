import { Router } from 'express';
import { NotificationController } from '../controller/notification.controller';
import { authenticate, requireRole } from '../../../middleware/auth';
import { asyncHandler } from '../../../utils/asyncHandler';

const router = Router();
const controller = new NotificationController();

const ALL_ROLES = ['Admin', 'Asset Manager', 'Department Head', 'Employee'];
const MANAGER_ROLES = ['Admin', 'Asset Manager'];

// Preferences configuration
router.get('/preferences',
  authenticate,
  requireRole(ALL_ROLES),
  asyncHandler(controller.getPreferences)
);

router.put('/preferences',
  authenticate,
  requireRole(ALL_ROLES),
  asyncHandler(controller.updatePreferences)
);

// Fetch & Aggregates
router.get('/my',
  authenticate,
  requireRole(ALL_ROLES),
  asyncHandler(controller.listMyNotifications)
);

router.get('/unread-count',
  authenticate,
  requireRole(ALL_ROLES),
  asyncHandler(controller.getUnreadCount)
);

// Status Mutations (Bulk)
router.put('/read',
  authenticate,
  requireRole(ALL_ROLES),
  asyncHandler(controller.markAsRead)
);

router.put('/read-all',
  authenticate,
  requireRole(ALL_ROLES),
  asyncHandler(controller.markAllRead)
);

router.put('/archive',
  authenticate,
  requireRole(ALL_ROLES),
  asyncHandler(controller.archiveBulk)
);

router.delete('/delete-bulk',
  authenticate,
  requireRole(ALL_ROLES),
  asyncHandler(controller.softDeleteBulk)
);

// System/Admin create notification trigger
router.post('/',
  authenticate,
  requireRole(MANAGER_ROLES),
  asyncHandler(controller.createNotification)
);

export default router;

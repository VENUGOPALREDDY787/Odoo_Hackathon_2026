import { Router } from 'express';
import { EmployeeController } from '../controller/employee.controller';
import { authenticate, requireRole } from '../../../middleware/auth';
import { asyncHandler } from '../../../utils/asyncHandler';

const router = Router();
const controller = new EmployeeController();

// Profile detail retrieval
router.get('/profile', authenticate, asyncHandler(controller.getProfile));

// Directory listings
router.get('/', authenticate, asyncHandler(controller.listEmployees));

// Role, department, and status modifications (Admin only)
router.put('/:id/role', authenticate, requireRole(['Admin']), asyncHandler(controller.updateRole));
router.put('/:id/department', authenticate, requireRole(['Admin']), asyncHandler(controller.updateDepartment));
router.put('/:id/status', authenticate, requireRole(['Admin']), asyncHandler(controller.updateStatus));

export default router;

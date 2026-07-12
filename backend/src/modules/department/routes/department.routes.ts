import { Router } from 'express';
import { DepartmentController } from '../controller/department.controller';
import { authenticate, requireRole } from '../../../middleware/auth';
import { asyncHandler } from '../../../utils/asyncHandler';

const router = Router();
const controller = new DepartmentController();

// Directory list & profile retrieval (Any authenticated employee)
router.get('/', authenticate, asyncHandler(controller.listDepartments));
router.get('/:id', authenticate, asyncHandler(controller.getDepartment));

// Organizational setup controls (Admin only)
router.post('/', authenticate, requireRole(['Admin']), asyncHandler(controller.createDepartment));
router.put('/:id', authenticate, requireRole(['Admin']), asyncHandler(controller.updateDepartment));
router.put('/:id/deactivate', authenticate, requireRole(['Admin']), asyncHandler(controller.deactivateDepartment));
router.put('/:id/restore', authenticate, requireRole(['Admin']), asyncHandler(controller.restoreDepartment));
router.put('/:id/head', authenticate, requireRole(['Admin']), asyncHandler(controller.assignDepartmentHead));

export default router;

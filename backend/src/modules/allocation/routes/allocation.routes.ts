import { Router } from 'express';
import { AllocationController } from '../controller/allocation.controller';
import { authenticate, requireRole } from '../../../middleware/auth';
import { asyncHandler } from '../../../utils/asyncHandler';

const router = Router();
const controller = new AllocationController();

// Basic list and details (Any authenticated user)
router.get('/', authenticate, asyncHandler(controller.listAllocations));
router.get('/:id', authenticate, asyncHandler(controller.getAllocation));

// Checkout allocations (Admin & Asset Manager only)
router.post('/', authenticate, requireRole(['Admin', 'Asset Manager']), asyncHandler(controller.allocateAsset));
router.post('/bulk', authenticate, requireRole(['Admin', 'Asset Manager']), asyncHandler(controller.bulkAllocate));

// Return check-ins (Admin, Asset Manager, & Department Head only)
router.post('/:assetId/return', authenticate, requireRole(['Admin', 'Asset Manager', 'Department Head']), asyncHandler(controller.returnAsset));
router.post('/bulk/return', authenticate, requireRole(['Admin', 'Asset Manager', 'Department Head']), asyncHandler(controller.bulkReturn));

export default router;

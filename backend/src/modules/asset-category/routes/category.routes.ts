import { Router } from 'express';
import { CategoryController } from '../controller/category.controller';
import { authenticate, requireRole } from '../../../middleware/auth';
import { asyncHandler } from '../../../utils/asyncHandler';

const router = Router();
const controller = new CategoryController();

// Directory list & profile retrieval (Any authenticated employee)
router.get('/', authenticate, asyncHandler(controller.listCategories));
router.get('/:id', authenticate, asyncHandler(controller.getCategory));

// Category setup controls (Admin only)
router.post('/', authenticate, requireRole(['Admin']), asyncHandler(controller.createCategory));
router.put('/:id', authenticate, requireRole(['Admin']), asyncHandler(controller.updateCategory));
router.delete('/:id', authenticate, requireRole(['Admin']), asyncHandler(controller.deleteCategory));

export default router;

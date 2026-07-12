import { Router } from 'express';
import { AssetController } from '../controller/asset.controller';
import { authenticate, requireRole } from '../../../middleware/auth';
import { asyncHandler } from '../../../utils/asyncHandler';

const router = Router();
const controller = new AssetController();

// Basic directory list and profile details (Any authenticated user)
router.get('/', authenticate, asyncHandler(controller.listAssets));
router.get('/:id', authenticate, asyncHandler(controller.getAsset));
router.get('/:id/qrcode', authenticate, asyncHandler(controller.getQRCode));

// Asset operations and bulk management (Admin & Asset Manager only)
router.post('/', authenticate, requireRole(['Admin', 'Asset Manager']), asyncHandler(controller.createAsset));
router.put('/:id', authenticate, requireRole(['Admin', 'Asset Manager']), asyncHandler(controller.updateAsset));
router.delete('/:id', authenticate, requireRole(['Admin', 'Asset Manager']), asyncHandler(controller.deleteAsset));
router.put('/:id/restore', authenticate, requireRole(['Admin', 'Asset Manager']), asyncHandler(controller.restoreAsset));
router.get('/:id/history', authenticate, requireRole(['Admin', 'Asset Manager']), asyncHandler(controller.getHistory));

// Bulk imports & exports (Admin & Asset Manager only)
router.post('/import', authenticate, requireRole(['Admin', 'Asset Manager']), asyncHandler(controller.bulkImport));
router.get('/export/csv', authenticate, requireRole(['Admin', 'Asset Manager']), asyncHandler(controller.bulkExport));

export default router;

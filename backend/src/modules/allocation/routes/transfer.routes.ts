import { Router } from 'express';
import { TransferController } from '../controller/transfer.controller';
import { authenticate, requireRole } from '../../../middleware/auth';
import { asyncHandler } from '../../../utils/asyncHandler';

const router = Router();
const controller = new TransferController();

// Basic list and submit transfer requests
router.get('/', authenticate, asyncHandler(controller.listTransfers));
router.post('/', authenticate, asyncHandler(controller.requestTransfer));

// Cancel request (Requester only check is executed inside service layer)
router.put('/:id/cancel', authenticate, asyncHandler(controller.cancelTransfer));

// Approve/Reject workflows (Admin & Asset Manager only)
router.put('/:id/approve', authenticate, requireRole(['Admin', 'Asset Manager']), asyncHandler(controller.approveTransfer));
router.put('/:id/reject', authenticate, requireRole(['Admin', 'Asset Manager']), asyncHandler(controller.rejectTransfer));

export default router;

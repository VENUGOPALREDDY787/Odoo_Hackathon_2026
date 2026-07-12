const express = require('express');
const router = express.Router();
const allocationsController = require('./controller');
const { authenticate, requireRole } = require('../../middleware/auth');

// 1. Direct Allocation & Returns (Admin & Asset Manager only)
router.post('/', authenticate, requireRole(['Admin', 'Asset Manager']), allocationsController.allocateAsset);
router.post('/:id/return', authenticate, requireRole(['Admin', 'Asset Manager']), allocationsController.returnAsset);

// 2. Transfer Requests (Any authenticated employee can initiate)
router.post('/transfers', authenticate, allocationsController.requestTransfer);
router.get('/transfers', authenticate, allocationsController.listTransfers);

// 3. Process Transfer (Role check handled in service layer: Manager / Department Head)
router.put('/transfers/:id/action', authenticate, allocationsController.processTransfer);

module.exports = router;

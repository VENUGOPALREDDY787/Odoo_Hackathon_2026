const express = require('express');
const router = express.Router();
const assetsController = require('./controller');
const { authenticate, requireRole } = require('../../middleware/auth');

// Public listing & lookup for authenticated staff
router.get('/', authenticate, assetsController.listAssets);
router.get('/:id', authenticate, assetsController.getAsset);

// Register and modify assets (Admin & Asset Manager only)
router.post('/', authenticate, requireRole(['Admin', 'Asset Manager']), assetsController.createAsset);
router.put('/:id', authenticate, requireRole(['Admin', 'Asset Manager']), assetsController.updateAsset);
router.delete('/:id', authenticate, requireRole(['Admin', 'Asset Manager']), assetsController.deleteAsset);

module.exports = router;

const express = require('express');
const router = express.Router();
const maintenanceController = require('./controller');
const { authenticate, requireRole } = require('../../middleware/auth');

// Public listing & reporting (Any authenticated employee)
router.get('/', authenticate, maintenanceController.listRequests);
router.post('/', authenticate, maintenanceController.createRequest);

// Manager actions (Asset Manager and Admin only)
router.put('/:id/approval', authenticate, requireRole(['Admin', 'Asset Manager']), maintenanceController.approveRequest);
router.put('/:id/assign', authenticate, requireRole(['Admin', 'Asset Manager']), maintenanceController.assignTechnician);

// Work update actions (Asset Manager or Technician/assignee)
router.put('/:id/progress', authenticate, maintenanceController.updateProgress);

module.exports = router;

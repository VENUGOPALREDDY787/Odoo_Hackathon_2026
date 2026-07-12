const express = require('express');
const router = express.Router();
const employeesController = require('./controller');
const { authenticate, requireRole } = require('../../middleware/auth');

// Profile endpoint
router.get('/me', authenticate, employeesController.getMe);

// Employee list endpoint (visible to authenticated staff)
router.get('/', authenticate, employeesController.listEmployees);

// Promotion & status toggle endpoints (Admin only)
router.put('/:id/role', authenticate, requireRole(['Admin']), employeesController.updateRole);
router.put('/:id/status', authenticate, requireRole(['Admin']), employeesController.updateStatus);

module.exports = router;

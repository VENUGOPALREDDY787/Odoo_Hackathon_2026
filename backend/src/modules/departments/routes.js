const express = require('express');
const router = express.Router();
const departmentsController = require('./controller');
const { authenticate, requireRole } = require('../../middleware/auth');

// Public listing for authenticated employees
router.get('/', authenticate, departmentsController.listDepartments);

// Administrative modifications (Admin only)
router.post('/', authenticate, requireRole(['Admin']), departmentsController.createDepartment);
router.put('/:id', authenticate, requireRole(['Admin']), departmentsController.updateDepartment);
router.delete('/:id', authenticate, requireRole(['Admin']), departmentsController.deleteDepartment);

module.exports = router;

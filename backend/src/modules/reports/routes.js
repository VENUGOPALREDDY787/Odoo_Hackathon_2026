const express = require('express');
const router = express.Router();
const reportsController = require('./controller');
const { authenticate, requireRole } = require('../../middleware/auth');

// Dashboard home KPIs (accessible to all authenticated staff)
router.get('/dashboard-kpi', authenticate, reportsController.getDashboardKpi);

// Analytical reports (Managers, Admins, and Department Heads)
router.get('/utilization', authenticate, requireRole(['Admin', 'Asset Manager']), reportsController.getAssetUtilization);
router.get('/maintenance-frequency', authenticate, requireRole(['Admin', 'Asset Manager']), reportsController.getMaintenanceFrequency);
router.get('/retirement-due', authenticate, requireRole(['Admin', 'Asset Manager']), reportsController.getRetirementDue);
router.get('/department-allocations', authenticate, requireRole(['Admin', 'Asset Manager', 'Department Head']), reportsController.getDepartmentAllocations);
router.get('/booking-heatmap', authenticate, requireRole(['Admin', 'Asset Manager', 'Department Head']), reportsController.getBookingHeatmap);

module.exports = router;

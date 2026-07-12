const express = require('express');
const router = express.Router();
const notificationsController = require('./controller');
const { authenticate, requireRole } = require('../../middleware/auth');

// Employee notification feeds (Any authenticated staff)
router.get('/', authenticate, notificationsController.listNotifications);
router.put('/read-all', authenticate, notificationsController.markAllAsRead);
router.put('/:id/read', authenticate, notificationsController.markAsRead);

// Audit logs query endpoint (Admin and Asset Manager only)
router.get('/activity-logs', authenticate, requireRole(['Admin', 'Asset Manager']), notificationsController.listActivityLogs);

module.exports = router;

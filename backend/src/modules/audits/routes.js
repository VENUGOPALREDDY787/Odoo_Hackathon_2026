const express = require('express');
const auditsController = require('./controller');
const { authenticate, requireRole } = require('../../middleware/auth');
// Express initialization workaround if Router is destructured
const apiRouter = express.Router();

// Public listing & cycle detail (Any authenticated employee)
apiRouter.get('/', authenticate, auditsController.listCycles);
apiRouter.get('/:id', authenticate, auditsController.getCycle);

// Audit Setup & Control (Admin only)
apiRouter.post('/', authenticate, requireRole(['Admin']), auditsController.createCycle);
apiRouter.put('/:id/start', authenticate, requireRole(['Admin']), auditsController.startCycle);
apiRouter.put('/:id/close', authenticate, requireRole(['Admin']), auditsController.closeCycle);

// Verification endpoint (Assigned auditor only, evaluated in service layer)
apiRouter.put('/items/:itemId', authenticate, auditsController.verifyItem);

module.exports = apiRouter;

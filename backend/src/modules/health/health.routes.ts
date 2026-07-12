import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import HealthController from './health.controller';

const router = Router();
const controller = new HealthController();

// GET /health          — Liveness probe (fast, no DB check)
router.get('/', asyncHandler(controller.liveness));

// GET /health/ready    — Kubernetes readiness probe (DB + Redis)
router.get('/ready', asyncHandler(controller.readiness));

// GET /health/detailed — Full diagnostics (DB latency, Redis latency, memory)
router.get('/detailed', asyncHandler(controller.detailed));

export default router;

import { Router } from 'express';
import { AuthController } from '../controller/auth.controller';
import { authenticate } from '../../../middleware/auth';
import { asyncHandler } from '../../../utils/asyncHandler';

const router = Router();
const controller = new AuthController();

// Public Authentication & Password Recovery Endpoints
router.post('/signup', asyncHandler(controller.signup));
router.post('/login', asyncHandler(controller.login));
router.post('/refresh', asyncHandler(controller.refresh));
router.post('/forgot-password', asyncHandler(controller.forgotPassword));
router.post('/reset-password', asyncHandler(controller.resetPassword));

// Protected Authentication Endpoints
router.post('/logout', authenticate, asyncHandler(controller.logout));
router.post('/change-password', authenticate, asyncHandler(controller.changePassword));

export default router;

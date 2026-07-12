import bcrypt from 'bcrypt';
import crypto from 'crypto';
import redis from '../../../core/redis/client';
import { AuthRepository } from '../repository/auth.repository';
import { AppError } from '../../../core/errors/AppError';
import { logActivity } from '../../../utils/logger';
import { emailService } from '../../../core/email/service';
import { sessionService } from './session.service';
import prisma from '../../../database/db';

export class PasswordService {
  private authRepository: AuthRepository;
  private redisClient = redis;

  constructor(authRepository = new AuthRepository()) {
    this.authRepository = authRepository;
  }

  /**
   * Generates a 15-minute password reset token, saves it in Redis, and dispatches an email.
   */
  async forgotPassword(email: string): Promise<void> {
    const employee = await this.authRepository.findEmployeeByEmail(email);
    if (!employee) {
      // Security standard: Do not reveal user existence to protect against enum attacks
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const key = `auth:reset:${resetToken}`;

    // Store in Redis (15-minute TTL)
    await this.redisClient.set(key, employee.id, 'EX', 15 * 60);

    // Dispatch reset link
    const resetLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    const emailContent = `
      <h3>AssetFlow Password Reset</h3>
      <p>Hello ${employee.name},</p>
      <p>We received a request to reset your password. Click the link below to set a new password:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>This link is valid for 15 minutes. If you did not request this, please ignore this message.</p>
    `;

    await emailService.sendEmail(email, '[AssetFlow] Password Reset Request', emailContent);

    await logActivity({
      organizationId: employee.organizationId,
      userId: employee.id,
      action: 'FORGOT_PASSWORD_REQUESTED',
      entityType: 'Employee',
      entityId: employee.id
    });
  }

  /**
   * Validates reset tokens from Redis and updates passwords.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const key = `auth:reset:${token}`;
    const userId = await this.redisClient.get(key);

    if (!userId) {
      throw new AppError('Invalid or expired password reset token.', 400, 'INVALID_RESET_TOKEN');
    }

    const employee = await this.authRepository.findEmployeeById(userId);
    if (!employee) {
      throw new AppError('User not found.', 404, 'EMPLOYEE_NOT_FOUND');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Perform database and cache updates in single transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update password
      await tx.employee.update({
        where: { id: userId },
        data: {
          passwordHash,
          refreshToken: null // Clears DB session backups
        }
      });

      // 2. Invalidate all active sessions in Redis to force logouts everywhere
      await sessionService.invalidateAllSessions(userId);

      // 3. Clear Redis reset token key
      await this.redisClient.del(key);

      // 4. Log reset activity
      await logActivity({
        organizationId: employee.organizationId,
        userId,
        action: 'EMPLOYEE_PASSWORD_RESET',
        entityType: 'Employee',
        entityId: userId
      });

      // Send confirmation email
      const emailContent = `
        <h3>AssetFlow Security Alert</h3>
        <p>Hello ${employee.name},</p>
        <p>Your AssetFlow password has been successfully reset. If you did not perform this change, please contact security immediately.</p>
      `;
      await emailService.sendEmail(employee.email, '[AssetFlow] Password Changed Confirmed', emailContent);
    });
  }

  /**
   * Allows authenticated employees to change their passwords.
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const employee = await this.authRepository.findEmployeeById(userId);
    if (!employee) {
      throw new AppError('Employee profile not found.', 404, 'EMPLOYEE_NOT_FOUND');
    }

    const match = await bcrypt.compare(oldPassword, employee.passwordHash);
    if (!match) {
      throw new AppError('Incorrect old password.', 400, 'INCORRECT_OLD_PASSWORD');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction(async (tx) => {
      // 1. Update password
      await tx.employee.update({
        where: { id: userId },
        data: {
          passwordHash,
          refreshToken: null
        }
      });

      // 2. Clear sessions
      await sessionService.invalidateAllSessions(userId);

      // 3. Log change activity
      await logActivity({
        organizationId: employee.organizationId,
        userId,
        action: 'EMPLOYEE_PASSWORD_CHANGED',
        entityType: 'Employee',
        entityId: userId
      });

      // Send confirmation email
      const emailContent = `
        <h3>AssetFlow Security Alert</h3>
        <p>Hello ${employee.name},</p>
        <p>Your AssetFlow password has been successfully updated. If you did not perform this change, please contact security immediately.</p>
      `;
      await emailService.sendEmail(employee.email, '[AssetFlow] Password Changed Confirmed', emailContent);
    });
  }
}
export default PasswordService;

import { z } from 'zod';

// Strict password complexity rule: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special symbol
const passwordComplexity = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[@$!%*?&]/, 'Password must contain at least one special character (@$!%*?&)');

export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').max(100),
  email: z.string().email('Invalid email address format'),
  password: passwordComplexity,
  organizationId: z.string().uuid('Invalid organization ID format').optional()
}).strict();

export const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required')
}).strict();

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
}).strict();

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address format')
}).strict();

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordComplexity
}).strict();

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: passwordComplexity
}).strict();

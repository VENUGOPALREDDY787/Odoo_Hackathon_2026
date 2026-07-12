import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../service/auth.service';
import { PasswordService } from '../service/password.service';
import {
  signupSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema
} from '../validators/auth.validators';
import ApiResponse from '../../../core/responses/ApiResponse';

export class AuthController {
  private authService: AuthService;
  private passwordService: PasswordService;

  constructor(authService = new AuthService(), passwordService = new PasswordService()) {
    this.authService = authService;
    this.passwordService = passwordService;
  }

  /**
   * Registers a new employee, defaulting role to Employee.
   */
  signup = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const validated = signupSchema.parse(req.body);
    const data = await this.authService.signup(validated);
    ApiResponse.success(res, data, 'Employee registered successfully', 201);
  };

  /**
   * Logs in a user, returning access and refresh tokens.
   */
  login = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const validated = loginSchema.parse(req.body);
    const data = await this.authService.login(validated);
    ApiResponse.success(res, data, 'Logged in successfully', 200);
  };

  /**
   * Rotates access and refresh tokens.
   */
  refresh = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const validated = refreshSchema.parse(req.body);
    const data = await this.authService.refresh(validated.refreshToken);
    ApiResponse.success(res, data, 'Tokens rotated successfully', 200);
  };

  /**
   * Logs out the user and invalidates active Redis sessions.
   */
  logout = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const userId = (req as any).user.id;
    const validated = refreshSchema.parse(req.body);
    const accessTokenJti = (req as any).user.jti;
    
    await this.authService.logout(userId, validated.refreshToken, accessTokenJti);
    ApiResponse.success(res, null, 'Logged out successfully', 200);
  };

  /**
   * Requests a password reset link.
   */
  forgotPassword = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const validated = forgotPasswordSchema.parse(req.body);
    await this.passwordService.forgotPassword(validated.email);
    ApiResponse.success(res, null, 'If the email exists, a password reset link has been sent.', 200);
  };

  /**
   * Resets password using valid Redis tokens.
   */
  resetPassword = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const validated = resetPasswordSchema.parse(req.body);
    await this.passwordService.resetPassword(validated.token, validated.password);
    ApiResponse.success(res, null, 'Password has been reset successfully. Please login.', 200);
  };

  /**
   * Updates account password for logged-in employees.
   */
  changePassword = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const userId = (req as any).user.id;
    const validated = changePasswordSchema.parse(req.body);
    await this.passwordService.changePassword(userId, validated.oldPassword, validated.newPassword);
    ApiResponse.success(res, null, 'Password updated successfully.', 200);
  };
}
export default AuthController;

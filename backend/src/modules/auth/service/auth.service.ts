import bcrypt from 'bcrypt';
import { AuthRepository } from '../repository/auth.repository';
import { SignupDTO } from '../dto/signup.dto';
import { LoginDTO } from '../dto/login.dto';
import { AppError } from '../../../core/errors/AppError';
import { TokenHelper } from '../helpers/token.helper';
import { logActivity } from '../../../utils/logger';
import { sessionService } from './session.service';
import { AuthSession } from '../types/auth.types';

export class AuthService {
  private authRepository: AuthRepository;

  constructor(authRepository = new AuthRepository()) {
    this.authRepository = authRepository;
  }

  /**
   * Registers a new employee, defaulting role to Employee.
   */
  async signup(dto: SignupDTO) {
    const existing = await this.authRepository.findEmployeeByEmail(dto.email);
    if (existing) {
      throw new AppError('Email address is already registered.', 409, 'EMAIL_EXISTS');
    }

    let orgId = dto.organizationId;
    if (!orgId) {
      const defaultOrg = await this.authRepository.findFirstOrganization();
      if (!defaultOrg) {
        const newOrg = await this.authRepository.createOrganization('Default Organization', 'default-org');
        orgId = newOrg.id;
      } else {
        orgId = defaultOrg.id;
      }
    } else {
      const orgExists = await this.authRepository.findOrganizationById(orgId);
      if (!orgExists) {
        throw new AppError('Specified organization does not exist.', 404, 'ORGANIZATION_NOT_FOUND');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const employee = await this.authRepository.createEmployee({
      organization: { connect: { id: orgId } },
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: 'Employee', // Enforce Employee role default constraint
      status: 'Active'
    });

    await logActivity({
      organizationId: orgId,
      userId: employee.id,
      action: 'EMPLOYEE_SIGNUP',
      entityType: 'Employee',
      entityId: employee.id,
      details: { email: dto.email, name: dto.name }
    });

    const { passwordHash: _, refreshToken: __, ...result } = employee;
    return result;
  }

  /**
   * Logs in a user, verifies credentials, creates access/refresh tokens, and registers sessions in Redis.
   */
  async login(dto: LoginDTO): Promise<AuthSession> {
    const employee = await this.authRepository.findEmployeeByEmail(dto.email);
    if (!employee) {
      // Audit trail: Log failed login attempts
      await logActivity({
        organizationId: 'SYSTEM',
        userId: null,
        action: 'FAILED_LOGIN_ATTEMPT',
        entityType: 'Employee',
        entityId: null,
        details: { email: dto.email, reason: 'User not found' }
      });
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    if (employee.status !== 'Active') {
      throw new AppError('Your account has been deactivated. Please contact your administrator.', 403, 'ACCOUNT_DEACTIVATED');
    }

    const passwordMatch = await bcrypt.compare(dto.password, employee.passwordHash);
    if (!passwordMatch) {
      // Audit trail: Log failed login attempts
      await logActivity({
        organizationId: employee.organizationId,
        userId: employee.id,
        action: 'FAILED_LOGIN_ATTEMPT',
        entityType: 'Employee',
        entityId: employee.id,
        details: { email: dto.email, reason: 'Incorrect password' }
      });
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    // Generate rotated tokens with secure JTIs
    const { accessToken, refreshToken } = TokenHelper.generateTokens({
      id: employee.id,
      email: employee.email,
      role: employee.role as any,
      organizationId: employee.organizationId
    });

    // Save refresh token session state in Redis (7 days TTL)
    await sessionService.createSession(employee.id, refreshToken, 7 * 24 * 3600);

    // Save backup hash in database (Prisma Transaction)
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.authRepository.updateRefreshToken(employee.id, hashedRefreshToken);

    await logActivity({
      organizationId: employee.organizationId,
      userId: employee.id,
      action: 'EMPLOYEE_LOGIN',
      entityType: 'Employee',
      entityId: employee.id
    });

    return {
      user: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        organizationId: employee.organizationId
      },
      accessToken,
      refreshToken
    };
  }

  /**
   * Handles token rotation and invalidates previous session hashes in Redis.
   */
  async refresh(token: string) {
    try {
      const decoded = TokenHelper.verifyRefreshToken(token);
      const employee = await this.authRepository.findEmployeeById(decoded.id);

      if (!employee || employee.status !== 'Active') {
        throw new AppError('Session not found or invalid.', 401, 'INVALID_SESSION');
      }

      // Check if session exists in Redis
      const isValid = await sessionService.validateSession(employee.id, token);
      if (!isValid) {
        // Replay Attack Detection: invalidate all sessions immediately if reuse is detected!
        await sessionService.invalidateAllSessions(employee.id);
        await this.authRepository.updateRefreshToken(employee.id, null);
        throw new AppError('Session reuse detected. Access revoked across all devices.', 401, 'REPLAY_ATTACK_REVOKED');
      }

      // Generate new rotated tokens
      const { accessToken, refreshToken: newRefreshToken } = TokenHelper.generateTokens({
        id: employee.id,
        email: employee.email,
        role: employee.role as any,
        organizationId: employee.organizationId
      });

      // Update Redis sessions: remove old and write new
      await sessionService.invalidateSession(employee.id, token);
      await sessionService.createSession(employee.id, newRefreshToken, 7 * 24 * 3600);

      // Save backup hash in database
      const newHashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);
      await this.authRepository.updateRefreshToken(employee.id, newHashedRefreshToken);

      return {
        accessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Invalid or expired refresh token.', 401, 'INVALID_REFRESH_TOKEN');
    }
  }

  /**
   * Invalidates active sessions and blacklists access tokens in Redis.
   */
  async logout(userId: string, refreshToken: string, accessTokenJti: string) {
    // 1. Remove refresh session from Redis
    await sessionService.invalidateSession(userId, refreshToken);

    // 2. Blacklist access token in Redis (15 mins TTL)
    await sessionService.blacklistAccessToken(accessTokenJti, 15 * 60);

    // 3. Clear database backup token
    await this.authRepository.updateRefreshToken(userId, null);

    // 4. Log logout activity
    const employee = await this.authRepository.findEmployeeById(userId);
    if (employee) {
      await logActivity({
        organizationId: employee.organizationId,
        userId,
        action: 'EMPLOYEE_LOGOUT',
        entityType: 'Employee',
        entityId: userId
      });
    }

    return true;
  }
}
export default AuthService;

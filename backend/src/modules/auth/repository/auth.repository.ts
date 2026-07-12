import prisma from '../../../database/db';
import { Prisma } from '@prisma/client';

export class AuthRepository {
  /**
   * Retrieves an active employee by email.
   */
  async findEmployeeByEmail(email: string) {
    return prisma.employee.findFirst({
      where: { email, deletedAt: null }
    });
  }

  /**
   * Retrieves an active employee by ID.
   */
  async findEmployeeById(id: string) {
    return prisma.employee.findFirst({
      where: { id, deletedAt: null }
    });
  }

  /**
   * Registers a new employee in the database.
   */
  async createEmployee(data: Prisma.EmployeeCreateInput) {
    return prisma.employee.create({
      data
    });
  }

  /**
   * Updates the persistent refresh token hash for backup checks.
   */
  async updateRefreshToken(id: string, tokenHash: string | null) {
    return prisma.employee.update({
      where: { id },
      data: { refreshToken: tokenHash }
    });
  }

  /**
   * Updates an employee's password hash in the database.
   */
  async updatePassword(id: string, passwordHash: string) {
    return prisma.employee.update({
      where: { id },
      data: { passwordHash }
    });
  }

  /**
   * Resolves the default organization.
   */
  async findFirstOrganization() {
    return prisma.organization.findFirst();
  }

  /**
   * Verifies if an organization exists.
   */
  async findOrganizationById(id: string) {
    return prisma.organization.findUnique({
      where: { id }
    });
  }

  /**
   * Creates an organization fallback.
   */
  async createOrganization(name: string, slug: string) {
    return prisma.organization.create({
      data: { name, slug }
    });
  }
}
export default AuthRepository;

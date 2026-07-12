import { DashboardRepository } from '../repository/dashboard.repository';
import prisma from '../../../database/db';

/**
 * AnalyticsService — Calculates asset distributions, department summaries, and category maps.
 */
export class AnalyticsService {
  private repository: DashboardRepository;

  constructor(repository = new DashboardRepository()) {
    this.repository = repository;
  }

  /**
   * Retrieves category percentage maps.
   */
  async getCategoryDistribution(orgId: string) {
    const raw = await this.repository.getCategoryDistribution(orgId);
    const total = raw.reduce((sum, r) => sum + r._count.id, 0);

    const categories = await prisma.assetCategory.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true }
    });

    const nameMap = new Map(categories.map((c) => [c.id, c.name]));

    return raw.map((r) => {
      const name = nameMap.get(r.categoryId) || 'Unknown';
      return {
        categoryId: r.categoryId,
        categoryName: name,
        count: r._count.id,
        percentage: total > 0 ? Math.round((r._count.id / total) * 100) : 0
      };
    });
  }

  /**
   * Retrieves employee/department distributions.
   */
  async getDepartmentDistribution(orgId: string) {
    const raw = await this.repository.getDepartmentDistribution(orgId);
    const total = raw.reduce((sum, r) => sum + r._count.id, 0);

    const depts = await prisma.department.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true }
    });

    const nameMap = new Map(depts.map((d) => [d.id, d.name]));

    return raw.map((r) => {
      const name = r.departmentId ? nameMap.get(r.departmentId) || 'Unknown' : 'Unassigned';
      return {
        departmentId: r.departmentId,
        departmentName: name,
        count: r._count.id,
        percentage: total > 0 ? Math.round((r._count.id / total) * 100) : 0
      };
    });
  }
}

export default AnalyticsService;

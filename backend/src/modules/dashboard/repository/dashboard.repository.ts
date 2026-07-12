import prisma from '../../../database/db';
import { DashboardFilterDTO } from '../dto/dashboard.dto';

export class DashboardRepository {

  // Helper to build scoped where clause for Asset queries
  private buildAssetWhere(orgId: string, filters: DashboardFilterDTO) {
    const where: any = { organizationId: orgId, deletedAt: null };
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.location) where.location = filters.location;
    if (filters.assetStatus) where.status = filters.assetStatus;

    if (filters.departmentId) {
      where.allocations = {
        some: {
          status: 'Active',
          actualReturnDate: null,
          OR: [
            { departmentId: filters.departmentId },
            { employee: { departmentId: filters.departmentId } }
          ]
        }
      };
    } else if (filters.employeeId) {
      where.allocations = {
        some: {
          status: 'Active',
          actualReturnDate: null,
          employeeId: filters.employeeId
        }
      };
    }
    return where;
  }

  // ─── Asset Status Aggregations ──────────────────────────────────────────────

  async getAssetStatusCounts(orgId: string, filters: DashboardFilterDTO = {}) {
    const where = this.buildAssetWhere(orgId, filters);
    return prisma.asset.groupBy({
      by: ['status'],
      where,
      _count: { id: true }
    });
  }

  // ─── Transfer Actions ───────────────────────────────────────────────────────

  async getPendingTransferCount(orgId: string, filters: DashboardFilterDTO = {}) {
    const where: any = { organizationId: orgId, status: 'Pending' };

    if (filters.departmentId) {
      where.OR = [
        { fromDepartmentId: filters.departmentId },
        { toDepartmentId: filters.departmentId },
        { fromEmployee: { departmentId: filters.departmentId } },
        { toEmployee: { departmentId: filters.departmentId } }
      ];
    } else if (filters.employeeId) {
      where.OR = [
        { fromEmployeeId: filters.employeeId },
        { toEmployeeId: filters.employeeId },
        { requestedBy: filters.employeeId }
      ];
    }

    return prisma.transfer.count({ where });
  }

  // ─── Maintenance Actions ────────────────────────────────────────────────────

  async getPendingMaintenanceCount(orgId: string, filters: DashboardFilterDTO = {}) {
    const where: any = {
      organizationId: orgId,
      status: { in: ['Pending', 'Approved', 'Technician Assigned', 'In Progress'] }
    };

    if (filters.departmentId) {
      where.asset = {
        allocations: {
          some: {
            status: 'Active',
            actualReturnDate: null,
            OR: [
              { departmentId: filters.departmentId },
              { employee: { departmentId: filters.departmentId } }
            ]
          }
        }
      };
    } else if (filters.employeeId) {
      where.raisedBy = filters.employeeId;
    }

    return prisma.maintenanceRequest.count({ where });
  }

  async getMaintenanceTodayCount(orgId: string, filters: DashboardFilterDTO = {}) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const where: any = {
      organizationId: orgId,
      status: 'In Progress',
      startedAt: { gte: todayStart, lte: todayEnd }
    };

    if (filters.departmentId) {
      where.asset = {
        allocations: {
          some: {
            status: 'Active',
            actualReturnDate: null,
            OR: [
              { departmentId: filters.departmentId },
              { employee: { departmentId: filters.departmentId } }
            ]
          }
        }
      };
    } else if (filters.employeeId) {
      where.raisedBy = filters.employeeId;
    }

    return prisma.maintenanceRequest.count({ where });
  }

  // ─── Return Tracking ────────────────────────────────────────────────────────

  async getUpcomingReturnCount(orgId: string, filters: DashboardFilterDTO = {}) {
    const now = new Date();
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);

    const where: any = {
      organizationId: orgId,
      status: 'Active',
      expectedReturnDate: { gte: now, lte: next7Days },
      actualReturnDate: null,
      deletedAt: null
    };

    if (filters.departmentId) {
      where.OR = [
        { departmentId: filters.departmentId },
        { employee: { departmentId: filters.departmentId } }
      ];
    } else if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    return prisma.allocation.count({ where });
  }

  async getOverdueReturnCount(orgId: string, filters: DashboardFilterDTO = {}) {
    const now = new Date();

    const where: any = {
      organizationId: orgId,
      deletedAt: null,
      OR: [
        { status: 'Overdue' },
        { status: 'Active', expectedReturnDate: { lt: now }, actualReturnDate: null }
      ]
    };

    if (filters.departmentId) {
      where.AND = [
        {
          OR: [
            { departmentId: filters.departmentId },
            { employee: { departmentId: filters.departmentId } }
          ]
        }
      ];
    } else if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    return prisma.allocation.count({ where });
  }

  // ─── Booking Actions ────────────────────────────────────────────────────────

  async getTodayBookingCount(orgId: string, filters: DashboardFilterDTO = {}) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const where: any = {
      organizationId: orgId,
      startTime: { gte: todayStart, lte: todayEnd },
      status: { notIn: ['Cancelled', 'Rejected'] }
    };

    if (filters.departmentId) {
      where.OR = [
        { bookedOnBehalfOfDeptId: filters.departmentId },
        { booker: { departmentId: filters.departmentId } }
      ];
    } else if (filters.employeeId) {
      where.bookedBy = filters.employeeId;
    }

    return prisma.resourceBooking.count({ where });
  }

  async getOngoingBookingCount(orgId: string, filters: DashboardFilterDTO = {}) {
    const now = new Date();

    const where: any = {
      organizationId: orgId,
      status: 'Ongoing',
      startTime: { lte: now },
      endTime: { gte: now }
    };

    if (filters.departmentId) {
      where.OR = [
        { bookedOnBehalfOfDeptId: filters.departmentId },
        { booker: { departmentId: filters.departmentId } }
      ];
    } else if (filters.employeeId) {
      where.bookedBy = filters.employeeId;
    }

    return prisma.resourceBooking.count({ where });
  }

  // ─── Audit Actions ──────────────────────────────────────────────────────────

  async getPendingAuditsCount(orgId: string, filters: DashboardFilterDTO = {}) {
    const where: any = {
      organizationId: orgId,
      status: { in: ['Draft', 'Scheduled', 'In Progress'] },
      deletedAt: null
    };

    if (filters.departmentId) {
      where.scopeDepartmentId = filters.departmentId;
    } else if (filters.employeeId) {
      where.auditors = {
        some: { employeeId: filters.employeeId }
      };
    }

    return prisma.auditCycle.count({ where });
  }

  async getOpenDiscrepanciesCount(orgId: string, filters: DashboardFilterDTO = {}) {
    const where: any = {
      auditCycle: { organizationId: orgId, deletedAt: null },
      resolvedAt: null
    };

    if (filters.departmentId) {
      where.auditCycle.scopeDepartmentId = filters.departmentId;
    } else if (filters.employeeId) {
      where.asset = {
        allocations: {
          some: {
            status: 'Active',
            actualReturnDate: null,
            employeeId: filters.employeeId
          }
        }
      };
    }

    return prisma.auditDiscrepancy.count({ where });
  }

  // ─── Distributions ──────────────────────────────────────────────────────────

  async getCategoryDistribution(orgId: string, filters: DashboardFilterDTO = {}) {
    const where = this.buildAssetWhere(orgId, filters);
    return prisma.asset.groupBy({
      by: ['categoryId'],
      where,
      _count: { id: true }
    });
  }

  async getDepartmentDistribution(orgId: string, filters: DashboardFilterDTO = {}) {
    const where: any = { organizationId: orgId, deletedAt: null };
    if (filters.departmentId) {
      where.departmentId = filters.departmentId;
    }
    return prisma.employee.groupBy({
      by: ['departmentId'],
      where,
      _count: { id: true }
    });
  }

  // ─── Trends ─────────────────────────────────────────────────────────────────

  async getMaintenanceCosts(orgId: string, filters: DashboardFilterDTO = {}) {
    const where: any = {
      organizationId: orgId,
      status: { in: ['Resolved', 'Closed'] },
      resolvedAt: { not: null }
    };

    if (filters.departmentId) {
      where.asset = {
        allocations: {
          some: {
            status: 'Active',
            actualReturnDate: null,
            OR: [
              { departmentId: filters.departmentId },
              { employee: { departmentId: filters.departmentId } }
            ]
          }
        }
      };
    } else if (filters.employeeId) {
      where.raisedBy = filters.employeeId;
    }

    return (prisma.maintenanceRequest.groupBy as any)({
      by: ['resolvedAt'],
      where,
      _sum: { actualCost: true }
    });
  }

  async getAuditCompletionStats(orgId: string, filters: DashboardFilterDTO = {}) {
    const where: any = { organizationId: orgId, status: 'Closed', deletedAt: null };
    if (filters.departmentId) {
      where.scopeDepartmentId = filters.departmentId;
    }
    return prisma.auditCycle.findMany({
      where,
      select: {
        id: true,
        name: true,
        totalAssets: true,
        verifiedCount: true,
        missingCount: true,
        damagedCount: true,
        closedAt: true
      },
      orderBy: { closedAt: 'desc' },
      take: 5
    });
  }

  // ─── Asset Utilization ──────────────────────────────────────────────────────

  async getAssetUtilization(orgId: string, filters: DashboardFilterDTO = {}) {
    const allocWhere: any = { organizationId: orgId, deletedAt: null };
    const bookingWhere: any = { organizationId: orgId };
    const assetWhere = this.buildAssetWhere(orgId, filters);

    if (filters.departmentId) {
      allocWhere.OR = [
        { departmentId: filters.departmentId },
        { employee: { departmentId: filters.departmentId } }
      ];
      bookingWhere.OR = [
        { bookedOnBehalfOfDeptId: filters.departmentId },
        { booker: { departmentId: filters.departmentId } }
      ];
    } else if (filters.employeeId) {
      allocWhere.employeeId = filters.employeeId;
      bookingWhere.bookedBy = filters.employeeId;
    }

    const [allocations, bookings, assets] = await Promise.all([
      prisma.allocation.groupBy({
        by: ['assetId'],
        _count: { id: true },
        where: allocWhere
      }),
      prisma.resourceBooking.groupBy({
        by: ['assetId'],
        _count: { id: true },
        where: bookingWhere
      }),
      prisma.asset.findMany({
        where: assetWhere,
        select: { id: true, name: true, assetTag: true, isShared: true }
      })
    ]);

    const utilizationMap: Record<string, any> = {};
    assets.forEach(asset => {
      utilizationMap[asset.id] = {
        id: asset.id,
        name: asset.name,
        assetTag: asset.assetTag,
        isShared: asset.isShared,
        allocationCount: 0,
        bookingCount: 0,
        totalUseCount: 0
      };
    });

    allocations.forEach(a => {
      if (utilizationMap[a.assetId]) {
        utilizationMap[a.assetId].allocationCount = a._count.id;
        utilizationMap[a.assetId].totalUseCount += a._count.id;
      }
    });

    bookings.forEach(b => {
      if (utilizationMap[b.assetId]) {
        utilizationMap[b.assetId].bookingCount = b._count.id;
        utilizationMap[b.assetId].totalUseCount += b._count.id;
      }
    });

    const sorted = Object.values(utilizationMap).sort((a, b) => b.totalUseCount - a.totalUseCount);

    return {
      mostUsed: sorted.slice(0, 10),
      idle: sorted.filter(a => a.totalUseCount === 0)
    };
  }

  // ─── Maintenance Frequency ─────────────────────────────────────────────────

  async getMaintenanceFrequency(orgId: string, filters: DashboardFilterDTO = {}) {
    const where: any = { organizationId: orgId };

    if (filters.departmentId) {
      where.asset = {
        allocations: {
          some: {
            status: 'Active',
            actualReturnDate: null,
            OR: [
              { departmentId: filters.departmentId },
              { employee: { departmentId: filters.departmentId } }
            ]
          }
        }
      };
    } else if (filters.employeeId) {
      where.raisedBy = filters.employeeId;
    }

    const requests = await prisma.maintenanceRequest.findMany({
      where,
      include: {
        asset: {
          include: { category: true }
        }
      }
    });

    const categoryCounts: Record<string, number> = {};
    const assetCounts: Record<string, number> = {};

    requests.forEach(req => {
      if (!req.asset) return;
      const catName = req.asset.category?.name || 'Uncategorized';
      const assetName = `${req.asset.name} (${req.asset.assetTag})`;

      categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
      assetCounts[assetName] = (assetCounts[assetName] || 0) + 1;
    });

    return {
      byCategory: Object.entries(categoryCounts).map(([category, count]) => ({ category, count })),
      byAsset: Object.entries(assetCounts)
        .map(([asset, count]) => ({ asset, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    };
  }

  // ─── Nearing Retirement ─────────────────────────────────────────────────────

  async getRetirementDue(orgId: string, filters: DashboardFilterDTO = {}) {
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    const where = this.buildAssetWhere(orgId, filters);
    where.status = { notIn: ['Retired', 'Disposed'] };
    where.OR = [
      { condition: { in: ['Poor', 'Damaged'] } },
      { acquisitionDate: { lt: threeYearsAgo } }
    ];

    return prisma.asset.findMany({
      where,
      include: { category: true },
      orderBy: { acquisitionDate: 'asc' }
    });
  }

  // ─── Department allocations ────────────────────────────────────────────────

  async getDepartmentAllocations(orgId: string, filters: DashboardFilterDTO = {}) {
    const where: any = {
      organizationId: orgId,
      status: 'Active',
      actualReturnDate: null,
      deletedAt: null
    };

    if (filters.departmentId) {
      where.OR = [
        { departmentId: filters.departmentId },
        { employee: { departmentId: filters.departmentId } }
      ];
    } else if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    const deptAllocations = await prisma.allocation.findMany({
      where,
      include: {
        department: true,
        employee: {
          include: { department: true }
        }
      }
    });

    const counts: Record<string, number> = {};

    deptAllocations.forEach(alloc => {
      let deptName = 'Unassigned';
      if (alloc.departmentId && alloc.department) {
        deptName = alloc.department.name;
      } else if (alloc.employee && alloc.employee.department) {
        deptName = alloc.employee.department.name;
      }

      counts[deptName] = (counts[deptName] || 0) + 1;
    });

    return Object.entries(counts).map(([department, count]) => ({ department, count }));
  }

  // ─── Booking Heatmap ────────────────────────────────────────────────────────

  async getBookingHeatmap(orgId: string, filters: DashboardFilterDTO = {}) {
    const where: any = { organizationId: orgId, status: { not: 'Cancelled' } };

    if (filters.departmentId) {
      where.OR = [
        { bookedOnBehalfOfDeptId: filters.departmentId },
        { booker: { departmentId: filters.departmentId } }
      ];
    } else if (filters.employeeId) {
      where.bookedBy = filters.employeeId;
    }

    const bookings = await prisma.resourceBooking.findMany({
      where,
      select: { startTime: true, endTime: true }
    });

    const hourDistribution = Array(24).fill(0);
    const weekdayDistribution = Array(7).fill(0);

    bookings.forEach(b => {
      const startHour = b.startTime.getUTCHours();
      const endHour = b.endTime.getUTCHours();
      const day = b.startTime.getUTCDay();

      weekdayDistribution[day]++;

      for (let h = startHour; h <= endHour && h < 24; h++) {
        hourDistribution[h]++;
      }
    });

    return {
      byHour: hourDistribution.map((count, hour) => ({ hour: `${hour}:00`, count })),
      byDay: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, idx) => ({
        day,
        count: weekdayDistribution[idx]
      }))
    };
  }
}

export default DashboardRepository;


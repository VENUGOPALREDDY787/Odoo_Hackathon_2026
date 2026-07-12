import prisma from '../../../database/db';
import { ReportFilterDTO } from '../dto/reports.dto';

export class ReportsRepository {
  // Helper to build where clause for Asset queries
  private buildAssetWhere(orgId: string, filters: ReportFilterDTO) {
    const where: any = { organizationId: orgId, deletedAt: null };
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.location) where.location = filters.location;
    if (filters.assetStatus) where.status = filters.assetStatus;
    if (filters.startDate || filters.endDate) {
      where.acquisitionDate = {};
      if (filters.startDate) where.acquisitionDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.acquisitionDate.lte = new Date(filters.endDate);
    }
    return where;
  }

  // 1. Asset Utilization
  async getAssetUtilization(orgId: string, filters: ReportFilterDTO = {}) {
    const assetWhere = this.buildAssetWhere(orgId, filters);

    // Fetch allocations & bookings grouped by asset
    const [allocations, bookings, assets] = await Promise.all([
      prisma.allocation.groupBy({
        by: ['assetId'],
        _count: { id: true },
        where: { organizationId: orgId, deletedAt: null }
      }),
      prisma.resourceBooking.groupBy({
        by: ['assetId'],
        _count: { id: true },
        where: { organizationId: orgId }
      }),
      prisma.asset.findMany({
        where: assetWhere,
        select: { id: true, name: true, assetTag: true }
      })
    ]);

    const allocMap = new Map(allocations.map(a => [a.assetId, a._count.id]));
    const bookMap = new Map(bookings.map(b => [b.assetId, b._count.id]));

    return assets.map(asset => {
      const aCount = allocMap.get(asset.id) || 0;
      const bCount = bookMap.get(asset.id) || 0;
      return {
        assetId: asset.id,
        name: asset.name,
        assetTag: asset.assetTag,
        allocationCount: aCount,
        bookingCount: bCount,
        totalUseCount: aCount + bCount
      };
    });
  }

  // 2. Department Allocation
  async getDepartmentAllocation(orgId: string, filters: ReportFilterDTO = {}) {
    const where: any = {
      organizationId: orgId,
      status: 'Active',
      actualReturnDate: null,
      deletedAt: null
    };
    if (filters.departmentId) where.departmentId = filters.departmentId;

    const allocations = await prisma.allocation.findMany({
      where,
      include: {
        department: true,
        asset: true,
        employee: { include: { department: true } }
      }
    });

    const deptMap = new Map<string, { activeCount: number; totalCost: number }>();

    allocations.forEach(a => {
      let deptName = 'Unassigned';
      if (a.departmentId && a.department) {
        deptName = a.department.name;
      } else if (a.employee && a.employee.department) {
        deptName = a.employee.department.name;
      }

      const cost = a.asset ? Number(a.asset.acquisitionCost) : 0;
      const current = deptMap.get(deptName) || { activeCount: 0, totalCost: 0 };
      deptMap.set(deptName, {
        activeCount: current.activeCount + 1,
        totalCost: current.totalCost + cost
      });
    });

    return Array.from(deptMap.entries()).map(([departmentName, data]) => ({
      departmentName,
      activeCount: data.activeCount,
      totalCost: data.totalCost
    }));
  }

  // 3. Employee Allocation
  async getEmployeeAllocation(orgId: string, filters: ReportFilterDTO = {}) {
    const where: any = {
      organizationId: orgId,
      status: 'Active',
      actualReturnDate: null,
      deletedAt: null
    };
    if (filters.employeeId) where.employeeId = filters.employeeId;

    const allocations = await prisma.allocation.findMany({
      where,
      include: {
        employee: true
      }
    });

    const empMap = new Map<string, { email: string; count: number }>();

    allocations.forEach(a => {
      if (a.employee) {
        const current = empMap.get(a.employee.name) || { email: a.employee.email, count: 0 };
        empMap.set(a.employee.name, {
          email: current.email,
          count: current.count + 1
        });
      }
    });

    return Array.from(empMap.entries()).map(([employeeName, data]) => ({
      employeeName,
      employeeEmail: data.email,
      activeCount: data.count
    }));
  }

  // 4. Maintenance Frequency
  async getMaintenanceFrequency(orgId: string, filters: ReportFilterDTO = {}) {
    const where: any = { organizationId: orgId };
    if (filters.categoryId) where.asset = { categoryId: filters.categoryId };

    const requests = await prisma.maintenanceRequest.findMany({
      where,
      include: {
        asset: { include: { category: true } }
      }
    });

    const assetMap = new Map<string, { name: string; tag: string; cat: string; count: number }>();

    requests.forEach(r => {
      if (r.asset) {
        const current = assetMap.get(r.assetId) || {
          name: r.asset.name,
          tag: r.asset.assetTag,
          cat: r.asset.category?.name || 'Uncategorized',
          count: 0
        };
        assetMap.set(r.assetId, {
          ...current,
          count: current.count + 1
        });
      }
    });

    return Array.from(assetMap.values()).map(item => ({
      assetName: item.name,
      assetTag: item.tag,
      categoryName: item.cat,
      requestCount: item.count
    }));
  }

  // 5. Maintenance Cost
  async getMaintenanceCost(orgId: string, filters: ReportFilterDTO = {}) {
    const where: any = { organizationId: orgId };
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const requests = await prisma.maintenanceRequest.findMany({
      where,
      include: { asset: true }
    });

    return requests.map(r => ({
      assetName: r.asset?.name || 'Unknown',
      assetTag: r.asset?.assetTag || 'Unknown',
      estimatedCost: r.estimatedCost ? Number(r.estimatedCost) : 0,
      actualCost: r.actualCost ? Number(r.actualCost) : 0
    }));
  }

  // 6. Asset Lifecycle
  async getAssetLifecycle(orgId: string, filters: ReportFilterDTO = {}) {
    const where = this.buildAssetWhere(orgId, filters);
    const assets = await prisma.asset.findMany({ where });

    return assets.map(a => ({
      assetName: a.name,
      assetTag: a.assetTag,
      status: a.status,
      condition: a.condition,
      createdAt: a.createdAt.toISOString()
    }));
  }

  // 7. Booking Utilization
  async getBookingUtilization(orgId: string, filters: ReportFilterDTO = {}) {
    const where: any = { organizationId: orgId };
    if (filters.categoryId) where.asset = { categoryId: filters.categoryId };

    const bookings = await prisma.resourceBooking.findMany({
      where,
      include: { asset: true }
    });

    const assetMap = new Map<string, { name: string; tag: string; count: number; hours: number }>();

    bookings.forEach(b => {
      if (b.asset) {
        const durationHours = Math.max(0, (b.endTime.getTime() - b.startTime.getTime()) / (1000 * 60 * 60));
        const current = assetMap.get(b.assetId) || { name: b.asset.name, tag: b.asset.assetTag, count: 0, hours: 0 };
        assetMap.set(b.assetId, {
          name: b.asset.name,
          tag: b.asset.assetTag,
          count: current.count + 1,
          hours: current.hours + durationHours
        });
      }
    });

    return Array.from(assetMap.values()).map(item => ({
      assetName: item.name,
      assetTag: item.tag,
      bookingCount: item.count,
      totalHours: Math.round(item.hours * 100) / 100
    }));
  }

  // 8. Booking Heatmap
  async getBookingHeatmap(orgId: string, filters: ReportFilterDTO = {}) {
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

  // 9. Asset Age
  async getAssetAge(orgId: string, filters: ReportFilterDTO = {}) {
    const where = this.buildAssetWhere(orgId, filters);
    const assets = await prisma.asset.findMany({ where });

    const now = new Date();
    return assets.map(a => {
      const ageDiff = now.getTime() - a.acquisitionDate.getTime();
      const ageYears = Math.round((ageDiff / (1000 * 60 * 60 * 24 * 365.25)) * 10) / 10;
      return {
        assetName: a.name,
        assetTag: a.assetTag,
        ageYears,
        acquisitionDate: a.acquisitionDate.toISOString().split('T')[0]
      };
    });
  }

  // 9. Warranty Expiry
  async getWarrantyExpiry(orgId: string, filters: ReportFilterDTO = {}) {
    const where = this.buildAssetWhere(orgId, filters);
    const assets = await prisma.asset.findMany({
      where,
      include: { category: true }
    });

    const now = new Date();
    return assets.map(a => {
      let warrantyPeriodMonths = 0;
      const fields = a.category.customFields as any;
      if (fields && fields.warrantyPeriod) {
        warrantyPeriodMonths = Number(fields.warrantyPeriod);
      }

      const expiryDate = new Date(a.acquisitionDate);
      expiryDate.setMonth(expiryDate.getMonth() + warrantyPeriodMonths);

      const isExpired = expiryDate < now;
      const status: 'Expired' | 'Active' | 'N/A' = warrantyPeriodMonths === 0 ? 'N/A' : (isExpired ? 'Expired' : 'Active');

      return {
        assetName: a.name,
        assetTag: a.assetTag,
        acquisitionDate: a.acquisitionDate.toISOString().split('T')[0],
        warrantyPeriodMonths,
        expiryDate: expiryDate.toISOString().split('T')[0],
        status
      };
    });
  }

  // 10. Maintenance Due
  async getMaintenanceDue(orgId: string, filters: ReportFilterDTO = {}) {
    const where = this.buildAssetWhere(orgId, filters);
    const assets = await prisma.asset.findMany({
      where,
      include: {
        maintenance: {
          where: { status: { in: ['Resolved', 'Closed'] } },
          orderBy: { resolvedAt: 'desc' },
          take: 1
        }
      }
    });

    const now = new Date();
    return assets.map(a => {
      const lastM = a.maintenance[0];
      const lastDate = lastM?.resolvedAt || null;
      let daysSince = null;

      if (lastDate) {
        daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      let dueStatus: 'Immediate' | 'Upcoming' | 'Good' = 'Good';
      if (a.condition === 'Poor' || a.condition === 'Damaged' || (daysSince && daysSince > 180)) {
        dueStatus = 'Immediate';
      } else if (daysSince && daysSince > 90) {
        dueStatus = 'Upcoming';
      }

      return {
        assetName: a.name,
        assetTag: a.assetTag,
        lastMaintenanceDate: lastDate ? lastDate.toISOString().split('T')[0] : null,
        daysSinceLastMaintenance: daysSince,
        dueStatus
      };
    });
  }

  // 11. Retirement Forecast
  async getRetirementForecast(orgId: string, filters: ReportFilterDTO = {}) {
    const where = this.buildAssetWhere(orgId, filters);
    const assets = await prisma.asset.findMany({ where });

    return assets.map(a => {
      // Deemed to retire 5 years after acquisition, or immediately if Poor/Damaged condition
      const retireDate = new Date(a.acquisitionDate);
      if (a.condition === 'Poor' || a.condition === 'Damaged') {
        retireDate.setMonth(retireDate.getMonth() + 6); // Retires soon (6 months)
      } else {
        retireDate.setFullYear(retireDate.getFullYear() + 5);
      }

      return {
        assetName: a.name,
        assetTag: a.assetTag,
        acquisitionDate: a.acquisitionDate.toISOString().split('T')[0],
        condition: a.condition,
        forecastedRetirementDate: retireDate.toISOString().split('T')[0]
      };
    });
  }

  // 12. Audit Summary
  async getAuditSummary(orgId: string, filters: ReportFilterDTO = {}) {
    const where: any = { organizationId: orgId, deletedAt: null };
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const audits = await prisma.auditCycle.findMany({ where });

    return audits.map(au => ({
      cycleName: au.name,
      scopeType: au.scopeType,
      verifiedCount: au.verifiedCount,
      missingCount: au.missingCount,
      damagedCount: au.damagedCount,
      status: au.status
    }));
  }

  // 13. Missing Asset
  async getMissingAssets(orgId: string, filters: ReportFilterDTO = {}) {
    const where = this.buildAssetWhere(orgId, filters);
    where.status = 'Lost';

    const assets = await prisma.asset.findMany({
      where,
      include: {
        auditItems: {
          where: { verificationStatus: 'Missing' },
          orderBy: { verifiedAt: 'desc' },
          take: 1
        }
      }
    });

    return assets.map(a => {
      const lastAudit = a.auditItems[0];
      return {
        assetName: a.name,
        assetTag: a.assetTag,
        location: a.location,
        lastSeenDate: lastAudit?.verifiedAt ? lastAudit.verifiedAt.toISOString().split('T')[0] : null
      };
    });
  }

  // 14. Damaged Asset
  async getDamagedAssets(orgId: string, filters: ReportFilterDTO = {}) {
    const where = this.buildAssetWhere(orgId, filters);
    where.condition = { in: ['Poor', 'Damaged'] };

    const assets = await prisma.asset.findMany({ where });

    return assets.map(a => ({
      assetName: a.name,
      assetTag: a.assetTag,
      condition: a.condition,
      status: a.status
    }));
  }

  // 15. Discrepancy
  async getDiscrepancies(orgId: string, filters: ReportFilterDTO = {}) {
    const where: any = {
      auditCycle: { organizationId: orgId, deletedAt: null },
      resolvedAt: null
    };

    if (filters.priority) {
      where.severity = filters.priority;
    }

    const discrepancies = await prisma.auditDiscrepancy.findMany({
      where,
      include: { asset: true }
    });

    return discrepancies.map(d => ({
      assetName: d.asset?.name || 'Unknown',
      assetTag: d.asset?.assetTag || 'Unknown',
      discrepancyType: d.discrepancyType,
      description: d.description,
      severity: d.severity
    }));
  }

  // 16. Asset Movement
  async getAssetMovement(orgId: string, filters: ReportFilterDTO = {}) {
    const where: any = { organizationId: orgId };
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const transfers = await prisma.transfer.findMany({
      where,
      include: {
        asset: true,
        fromEmployee: true,
        toEmployee: true,
        fromDepartment: true,
        toDepartment: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return transfers.map(t => {
      let fromName = 'Unknown';
      if (t.fromEmployee) fromName = t.fromEmployee.name;
      else if (t.fromDepartment) fromName = t.fromDepartment.name;

      let toName = 'Unknown';
      if (t.toEmployee) toName = t.toEmployee.name;
      else if (t.toDepartment) toName = t.toDepartment.name;

      return {
        assetName: t.asset?.name || 'Unknown',
        assetTag: t.asset?.assetTag || 'Unknown',
        actionType: 'Transfer',
        fromName,
        toName,
        timestamp: t.createdAt.toISOString()
      };
    });
  }

  // 17. Activity
  async getActivities(orgId: string, filters: ReportFilterDTO = {}) {
    const where: any = { organizationId: orgId };
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const logs = await prisma.activityLog.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return logs.map(l => ({
      userName: l.user?.name || 'System',
      action: l.action,
      module: l.module || 'Unknown',
      createdAt: l.createdAt.toISOString()
    }));
  }

  // 18. Notification
  async getNotifications(orgId: string, filters: ReportFilterDTO = {}) {
    const where: any = { organizationId: orgId };
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const notifs = await prisma.notification.findMany({
      where,
      include: { recipient: true },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return notifs.map(n => ({
      recipientName: n.recipient?.name || 'Unknown',
      type: n.type,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString()
    }));
  }

  // ─── Analytics & Advanced Aggregations ──────────────────────────────────────

  // Mean Time Between Failures (MTBF) using raw SQL / Window Functions
  async getAssetMTBF(orgId: string): Promise<any[]> {
    // Calculates the average time (in days) between consecutive maintenance resolutions for the same asset.
    return prisma.$queryRaw`
      WITH maintenance_intervals AS (
        SELECT 
          asset_id,
          resolved_at,
          LAG(resolved_at) OVER (PARTITION BY asset_id ORDER BY resolved_at ASC) as prev_resolved_at
        FROM maintenance_requests
        WHERE organization_id = ${orgId} AND status IN ('Resolved', 'Closed') AND resolved_at IS NOT NULL
      )
      SELECT 
        a.id as assetId,
        a.name as assetName,
        a.asset_tag as assetTag,
        AVG(DATEDIFF(mi.resolved_at, mi.prev_resolved_at)) as mtbfDays
      FROM maintenance_intervals mi
      JOIN assets a ON mi.asset_id = a.id
      WHERE mi.prev_resolved_at IS NOT NULL
      GROUP BY a.id, a.name, a.asset_tag
      ORDER BY mtbfDays DESC
    ` as any;
  }

  // Average Resolution Time (for maintenance)
  async getAvgResolutionTime(orgId: string) {
    return prisma.maintenanceRequest.aggregate({
      where: {
        organizationId: orgId,
        status: { in: ['Resolved', 'Closed'] },
        startedAt: { not: null },
        resolvedAt: { not: null }
      },
      _avg: {
        actualCost: true
      }
    });
  }

  // Cumulative Asset Growth
  async getAssetGrowth(orgId: string) {
    return prisma.$queryRaw`
      SELECT 
        DATE_FORMAT(acquisition_date, '%Y-%m') as month,
        COUNT(id) as count
      FROM assets
      WHERE organization_id = ${orgId} AND deleted_at IS NULL
      GROUP BY DATE_FORMAT(acquisition_date, '%Y-%m')
      ORDER BY month ASC
    ` as any;
  }

  async getTechnicianPerformance(orgId: string) {
    return prisma.maintenanceRequest.groupBy({
      by: ['assignedTechnician'],
      where: {
        organizationId: orgId,
        status: { in: ['Resolved', 'Closed'] },
        assignedTechnician: { not: null }
      },
      _count: { id: true },
      _avg: { actualCost: true }
    });
  }

  async getDepartmentEfficiency(orgId: string) {
    return prisma.allocation.groupBy({
      by: ['departmentId'],
      where: {
        organizationId: orgId,
        status: 'Returned',
        actualReturnDate: { not: null }
      },
      _count: { id: true }
    });
  }

  async getAssetAvailability(orgId: string) {
    const total = await prisma.asset.count({
      where: { organizationId: orgId, deletedAt: null }
    });
    const available = await prisma.asset.count({
      where: { organizationId: orgId, status: 'Available', deletedAt: null }
    });
    return { total, available, availabilityPercentage: total > 0 ? (available / total) * 100 : 100 };
  }

  async getMaintenanceTrends(orgId: string) {
    return prisma.maintenanceRequest.groupBy({
      by: ['status'],
      where: { organizationId: orgId },
      _count: { id: true },
      _sum: { actualCost: true }
    });
  }

  async getAllocationTrends(orgId: string) {
    return prisma.allocation.groupBy({
      by: ['status'],
      where: { organizationId: orgId, deletedAt: null },
      _count: { id: true }
    });
  }

  async getBookingTrends(orgId: string) {
    return prisma.resourceBooking.groupBy({
      by: ['status'],
      where: { organizationId: orgId },
      _count: { id: true }
    });
  }
}

export default ReportsRepository;

const prisma = require('../../config/db');

/**
 * Computes dynamic, real-time operational KPIs for the organization dashboard.
 */
async function getDashboardKpi(orgId) {
  const now = new Date();

  // 1. Assets Available
  const assetsAvailable = await prisma.asset.count({
    where: { organizationId: orgId, status: 'Available', deletedAt: null }
  });

  // 2. Assets Allocated
  const assetsAllocated = await prisma.asset.count({
    where: { organizationId: orgId, status: 'Allocated', deletedAt: null }
  });

  // 3. Maintenance Today (Pending, In Progress, Technician Assigned)
  const maintenanceToday = await prisma.maintenanceRequest.count({
    where: {
      organizationId: orgId,
      status: { in: ['Pending', 'Approved', 'Technician Assigned', 'In Progress'] }
    }
  });

  // 4. Active Bookings (Ongoing reservations)
  const activeBookings = await prisma.resourceBooking.count({
    where: { organizationId: orgId, status: 'Ongoing' }
  });

  // 5. Pending Transfers
  const pendingTransfers = await prisma.transfer.count({
    where: { organizationId: orgId, status: 'Pending' }
  });

  // 6. Upcoming Returns (Active, return date in future)
  const upcomingReturns = await prisma.allocation.count({
    where: {
      organizationId: orgId,
      status: 'Active',
      expectedReturnDate: { gt: now },
      actualReturnDate: null,
      deletedAt: null
    }
  });

  // 7. Overdue Returns (Active past expected date, or flagged Overdue)
  const overdueReturns = await prisma.allocation.count({
    where: {
      organizationId: orgId,
      OR: [
        { status: 'Overdue' },
        { status: 'Active', expectedReturnDate: { lt: now }, actualReturnDate: null }
      ],
      deletedAt: null
    }
  });

  return {
    assetsAvailable,
    assetsAllocated,
    maintenanceToday,
    activeBookings,
    pendingTransfers,
    upcomingReturns,
    overdueReturns
  };
}

/**
 * Computes asset utilization trends (most used and idle assets).
 */
async function getAssetUtilization(orgId) {
  // Count allocations per asset
  const allocations = await prisma.allocation.groupBy({
    by: ['assetId'],
    _count: { id: true },
    where: { organizationId: orgId, deletedAt: null }
  });

  // Count bookings per asset
  const bookings = await prisma.resourceBooking.groupBy({
    by: ['assetId'],
    _count: { id: true },
    where: { organizationId: orgId }
  });

  // Fetch all assets names and tags
  const assets = await prisma.asset.findMany({
    where: { organizationId: orgId, deletedAt: null },
    select: { id: true, name: true, assetTag: true, isShared: true }
  });

  // Map counts
  const utilizationMap = {};
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

  // Sort by usage count
  const sorted = Object.values(utilizationMap).sort((a, b) => b.totalUseCount - a.totalUseCount);

  return {
    mostUsed: sorted.slice(0, 10),
    idle: sorted.filter(a => a.totalUseCount === 0)
  };
}

/**
 * Calculates maintenance frequency by asset and category.
 */
async function getMaintenanceFrequency(orgId) {
  // Group by category to see repair hotspots
  const categoryStats = await prisma.maintenanceRequest.groupBy({
    by: ['assetId'], // Grouping by asset to trace category
    _count: { id: true },
    where: { organizationId: orgId }
  });

  // Fetch assets and categories
  const requests = await prisma.maintenanceRequest.findMany({
    where: { organizationId: orgId },
    include: {
      asset: {
        include: { category: true }
      }
    }
  });

  const categoryCounts = {};
  const assetCounts = {};

  requests.forEach(req => {
    const catName = req.asset.category.name;
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

/**
 * Identifies assets nearing retirement or due for inspection.
 */
async function getRetirementDue(orgId) {
  // Let's flag assets with condition = Poor or Damaged, and those that are older than 3 years (deemed aging in standard ERP)
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

  const assets = await prisma.asset.findMany({
    where: {
      organizationId: orgId,
      deletedAt: null,
      status: { notIn: ['Retired', 'Disposed'] },
      OR: [
        { condition: { in: ['Poor', 'Damaged'] } },
        { acquisitionDate: { lt: threeYearsAgo } }
      ]
    },
    include: { category: true },
    orderBy: { acquisitionDate: 'asc' }
  });

  return assets;
}

/**
 * Generates department-wise allocation counts.
 */
async function getDepartmentAllocations(orgId) {
  // Active allocations grouped by department
  const deptAllocations = await prisma.allocation.findMany({
    where: {
      organizationId: orgId,
      status: 'Active',
      actualReturnDate: null,
      deletedAt: null
    },
    include: {
      department: true,
      employee: {
        include: { department: true }
      }
    }
  });

  const counts = {};

  deptAllocations.forEach(alloc => {
    // If allocated directly to department or allocated to employee (track employee's department)
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

/**
 * Generates resource booking peak hours (hourly heatmap).
 */
async function getBookingHeatmap(orgId) {
  const bookings = await prisma.resourceBooking.findMany({
    where: { organizationId: orgId, status: { not: 'Cancelled' } },
    select: { startTime: true, endTime: true }
  });

  const hourDistribution = Array(24).fill(0);
  const weekdayDistribution = Array(7).fill(0); // 0 = Sunday, 1 = Monday, etc.

  bookings.forEach(b => {
    const startHour = b.startTime.getUTCHours();
    const endHour = b.endTime.getUTCHours();
    const day = b.startTime.getUTCDay();

    weekdayDistribution[day]++;

    // Log the hours spanned by the booking
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

module.exports = {
  getDashboardKpi,
  getAssetUtilization,
  getMaintenanceFrequency,
  getRetirementDue,
  getDepartmentAllocations,
  getBookingHeatmap
};

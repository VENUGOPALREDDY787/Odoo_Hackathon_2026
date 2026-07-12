import prisma from '../../../database/db';
import { AllocationRepository } from '../repository/allocation.repository';
import { logActivity } from '../../../utils/logger';
import { emitToOrg, emitToUser } from '../../../utils/socket';

export class OverdueService {
  private allocationRepository: AllocationRepository;

  constructor(allocationRepository = new AllocationRepository()) {
    this.allocationRepository = allocationRepository;
  }

  /**
   * Scans the database for expired expected return dates, updates status to Overdue, and triggers alerts.
   */
  async checkOverdueAllocations(orgId: string): Promise<number> {
    const now = new Date();
    const overdueList = await this.allocationRepository.findOverdueAllocations(orgId, now);

    for (const allocation of overdueList) {
      await prisma.$transaction(async (tx) => {
        // 1. Mark status as Overdue in DB
        await tx.allocation.update({
          where: { id: allocation.id },
          data: { status: 'Overdue' }
        });

        // 2. Notify the holding employee
        if (allocation.employeeId) {
          const notif = await tx.notification.create({
            data: {
              organizationId: orgId,
              recipientId: allocation.employeeId,
              title: 'Asset Checkout Overdue',
              message: `Your checkout for "${allocation.asset.name}" (${allocation.asset.assetTag}) was due back on ${allocation.expectedReturnDate?.toLocaleDateString()}. Please return it.`,
              type: 'Overdue Return Alert',
              relatedEntityType: 'Allocation',
              relatedEntityId: allocation.id
            }
          });

          emitToUser(allocation.employeeId, 'notification', notif);
        }

        // 3. Log Activity
        await logActivity({
          organizationId: orgId,
          userId: null, // SYSTEM trigger
          action: 'ALLOCATION_OVERDUE_ALERT',
          entityType: 'Allocation',
          entityId: allocation.id,
          details: { assetTag: allocation.asset.assetTag }
        });
      });

      emitToOrg(orgId, 'allocation.overdue', { id: allocation.id });
    }

    if (overdueList.length > 0) {
      emitToOrg(orgId, 'dashboard.updated', { type: 'kpi_update' });
    }

    return overdueList.length;
  }
}

export const overdueService = new OverdueService();
export default overdueService;

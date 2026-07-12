import { logActivity } from '../../../utils/logger';

export class AssetHistoryService {
  /**
   * Records a mutation trace history event inside the ActivityLog trace schema.
   */
  async recordChange(
    actorId: string,
    orgId: string,
    assetId: string,
    action: string,
    oldValue: any,
    newValue: any,
    additionalDetails?: any
  ): Promise<void> {
    await logActivity({
      organizationId: orgId,
      userId: actorId,
      action,
      entityType: 'Asset',
      entityId: assetId,
      details: {
        oldValue,
        newValue,
        ...additionalDetails
      }
    });
  }
}

export const assetHistoryService = new AssetHistoryService();
export default assetHistoryService;

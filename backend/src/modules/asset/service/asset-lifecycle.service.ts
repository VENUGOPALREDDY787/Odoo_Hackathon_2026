import { AppError } from '../../../core/errors/AppError';

export class AssetLifecycleService {
  // Strict transition states matrix definitions
  private readonly transitionMatrix: Record<string, string[]> = {
    'Available': ['Allocated', 'Reserved', 'Under Maintenance', 'Lost', 'Retired'],
    'Allocated': ['Available', 'Lost', 'Under Maintenance', 'Retired'],
    'Reserved': ['Available', 'Allocated', 'Lost'],
    'Under Maintenance': ['Available', 'Retired', 'Disposed'],
    'Lost': ['Available', 'Retired', 'Disposed'],
    'Retired': ['Disposed'],
    'Disposed': [] // Terminal state
  };

  /**
   * Asserts if a transition between asset status lifecycle states is mathematically valid.
   */
  validateTransition(oldStatus: string, newStatus: string): void {
    if (oldStatus === newStatus) {
      return; // Same state transitions are self-evident operations
    }

    const allowedTargets = this.transitionMatrix[oldStatus];
    if (!allowedTargets || !allowedTargets.includes(newStatus)) {
      throw new AppError(
        `Invalid lifecycle state transition from "${oldStatus}" to "${newStatus}".`,
        400,
        'INVALID_LIFECYCLE_STATE_TRANSITION'
      );
    }
  }
}

export const assetLifecycleService = new AssetLifecycleService();
export default assetLifecycleService;

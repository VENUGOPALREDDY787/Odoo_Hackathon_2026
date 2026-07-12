import { Request, Response, NextFunction } from 'express';
import { AllocationService } from '../service/allocation.service';
import { ReturnService } from '../service/return.service';
import { allocateAssetSchema, returnAssetSchema, bulkAllocateSchema, bulkReturnSchema } from '../validators/allocation.validators';
import ApiResponse from '../../../core/responses/ApiResponse';

export class AllocationController {
  private allocationService: AllocationService;
  private returnService: ReturnService;

  constructor(allocationService = new AllocationService(), returnService = new ReturnService()) {
    this.allocationService = allocationService;
    this.returnService = returnService;
  }

  /**
   * Checks out an asset to an employee or department.
   */
  allocateAsset = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const validated = allocateAssetSchema.parse(req.body);
    const data = await this.allocationService.allocateAsset(user.id, user.organizationId, validated);
    ApiResponse.success(res, data, 'Asset checked out successfully', 201);
  };

  /**
   * Processes returns for checked out assets.
   */
  returnAsset = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const validated = returnAssetSchema.parse(req.body);
    const data = await this.returnService.returnAsset(
      user.id,
      user.organizationId,
      req.params.assetId as string,
      validated
    );
    ApiResponse.success(res, data, 'Asset returned successfully', 200);
  };

  /**
   * Processes bulk checkouts.
   */
  bulkAllocate = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const validated = bulkAllocateSchema.parse(req.body);
    const data = await this.allocationService.bulkAllocate(user.id, user.organizationId, validated);
    ApiResponse.success(res, data, 'Bulk checkouts processed successfully', 201);
  };

  /**
   * Processes bulk returns.
   */
  bulkReturn = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const validated = bulkReturnSchema.parse(req.body);
    const data = await this.returnService.bulkReturn(user.id, user.organizationId, validated);
    ApiResponse.success(res, data, 'Bulk returns processed successfully', 200);
  };

  /**
   * Lists all allocations.
   */
  listAllocations = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const query = { ...req.query };

    // RBAC check: Employees see only their allocations
    if (user.role === 'Employee') {
      query.employeeId = user.id;
    }

    const data = await this.allocationService.listAllocations(user.organizationId, query);
    ApiResponse.success(res, data.allocations, 'Allocations retrieved successfully', 200, data.pagination);
  };

  /**
   * Retrieves detail profile of an allocation.
   */
  getAllocation = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const data = await this.allocationService.getAllocation(user.organizationId, req.params.id as string);
    ApiResponse.success(res, data, 'Allocation details retrieved successfully', 200);
  };
}
export default AllocationController;

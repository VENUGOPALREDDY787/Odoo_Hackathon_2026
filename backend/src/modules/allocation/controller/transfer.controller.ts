import { Request, Response, NextFunction } from 'express';
import { TransferService } from '../service/transfer.service';
import { transferRequestSchema, transferActionSchema } from '../validators/transfer.validators';
import ApiResponse from '../../../core/responses/ApiResponse';

export class TransferController {
  private transferService: TransferService;

  constructor(transferService = new TransferService()) {
    this.transferService = transferService;
  }

  /**
   * Requests a transfer for an asset.
   */
  requestTransfer = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const validated = transferRequestSchema.parse(req.body);
    const data = await this.transferService.requestTransfer(user.id, user.organizationId, validated);
    ApiResponse.success(res, data, 'Transfer request submitted successfully', 201);
  };

  /**
   * Approves a transfer request (Admin & Asset Manager only).
   */
  approveTransfer = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const validated = transferActionSchema.parse(req.body);
    const data = await this.transferService.approveTransfer(
      user.id,
      user.organizationId,
      req.params.id as string,
      validated.approvalNotes
    );
    ApiResponse.success(res, data, 'Transfer request approved successfully', 200);
  };

  /**
   * Rejects a transfer request (Admin & Asset Manager only).
   */
  rejectTransfer = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const validated = transferActionSchema.parse(req.body);
    const data = await this.transferService.rejectTransfer(
      user.id,
      user.organizationId,
      req.params.id as string,
      validated.approvalNotes
    );
    ApiResponse.success(res, data, 'Transfer request rejected successfully', 200);
  };

  /**
   * Cancels a pending transfer request.
   */
  cancelTransfer = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const data = await this.transferService.cancelTransfer(user.id, user.organizationId, req.params.id as string);
    ApiResponse.success(res, data, 'Transfer request cancelled successfully', 200);
  };

  /**
   * Lists transfers.
   */
  listTransfers = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const query = { ...req.query };

    // RBAC scoping: Department Heads view target/source transfers matching department ID
    if (user.role === 'Department Head') {
      const emp = await prisma.employee.findUnique({ where: { id: user.id } });
      if (emp?.departmentId) {
        query.OR = [
          { fromDepartmentId: emp.departmentId },
          { toDepartmentId: emp.departmentId }
        ];
      }
    } else if (user.role === 'Employee') {
      query.OR = [
        { fromEmployeeId: user.id },
        { toEmployeeId: user.id },
        { requestedBy: user.id }
      ];
    }

    const data = await this.transferService.listTransfers(user.organizationId, query);
    ApiResponse.success(res, data.transfers, 'Transfers retrieved successfully', 200, data.pagination);
  };
}
import prisma from '../../../database/db';
export default TransferController;

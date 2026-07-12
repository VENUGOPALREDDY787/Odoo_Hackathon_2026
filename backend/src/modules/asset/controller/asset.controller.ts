import { Request, Response, NextFunction } from 'express';
import { AssetService } from '../service/asset.service';
import { AssetSearchService } from '../service/asset-search.service';
import { qrCodeService } from '../service/qrcode.service';
import { assetExportService } from '../service/asset-export.service';
import { createAssetSchema, updateAssetSchema } from '../validators/asset.validators';
import ApiResponse from '../../../core/responses/ApiResponse';

export class AssetController {
  private assetService: AssetService;
  private assetSearchService: AssetSearchService;

  constructor(assetService = new AssetService(), assetSearchService = new AssetSearchService()) {
    this.assetService = assetService;
    this.assetSearchService = assetSearchService;
  }

  /**
   * Registers a new asset.
   */
  createAsset = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const validated = createAssetSchema.parse(req.body);
    const data = await this.assetService.createAsset(user.id, user.organizationId, validated);
    ApiResponse.success(res, data, 'Asset registered successfully', 201);
  };

  /**
   * Updates asset fields.
   */
  updateAsset = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const validated = updateAssetSchema.parse(req.body);
    const data = await this.assetService.updateAsset(
      user.id,
      user.organizationId,
      req.params.id as string,
      validated
    );
    ApiResponse.success(res, data, 'Asset updated successfully', 200);
  };

  /**
   * Performs soft deletion archiving.
   */
  deleteAsset = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    await this.assetService.softDeleteAsset(user.id, user.organizationId, req.params.id as string);
    ApiResponse.success(res, null, 'Asset archived successfully', 200);
  };

  /**
   * Restores a soft-deleted asset.
   */
  restoreAsset = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    await this.assetService.restoreAsset(user.id, user.organizationId, req.params.id as string);
    ApiResponse.success(res, null, 'Asset restored successfully', 200);
  };

  /**
   * Retrieves detail profile of a specific active asset.
   */
  getAsset = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const data = await this.assetService.getAsset(user.organizationId, req.params.id as string);
    ApiResponse.success(res, data, 'Asset retrieved successfully', 200);
  };

  /**
   * Returns list of assets matching query parameters.
   */
  listAssets = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const query = { ...req.query };

    // Enforce server-side RBAC scoping for Employees/Heads
    if (user.role === 'Employee') {
      // Employees see only assets currently allocated to them (handled in allocations query logic)
      query.allocatedToEmployeeId = user.id;
    }

    const data = await this.assetSearchService.searchAssets(user.organizationId, query);
    ApiResponse.success(res, data.assets, 'Assets retrieved successfully', 200, data.pagination);
  };

  /**
   * Encodes details to QR Code data URL.
   */
  getQRCode = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const asset = await this.assetService.getAsset(user.organizationId, req.params.id as string);
    const dataUrl = await qrCodeService.generateQRCode(asset.id, asset.assetTag, user.organizationId);
    ApiResponse.success(res, { qrCode: dataUrl }, 'QR Code generated successfully', 200);
  };

  /**
   * Traces history change logs.
   */
  getHistory = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const data = await this.assetService.getAssetHistory(user.organizationId, req.params.id as string);
    ApiResponse.success(res, data, 'Asset history logs retrieved successfully', 200);
  };

  /**
   * Handles bulk CSV file processing.
   */
  bulkImport = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    if (!req.body.csvText) {
      ApiResponse.error(res, 'Missing raw csvText string in request body.', 'MISSING_CSV_TEXT', 400);
      return;
    }
    const data = await this.assetService.bulkImport(user.id, user.organizationId, req.body.csvText);
    ApiResponse.success(res, data, 'Bulk import completed successfully', 200);
  };

  /**
   * Serializes search records to a CSV download attachment.
   */
  bulkExport = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const query = { ...req.query, page: 1, limit: 100000 }; // High threshold to fetch all matches
    const data = await this.assetSearchService.searchAssets(user.organizationId, query);
    const csvContent = assetExportService.convertToCSV(data.assets);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="assets.csv"');
    res.status(200).send(csvContent);
  };
}
export default AssetController;

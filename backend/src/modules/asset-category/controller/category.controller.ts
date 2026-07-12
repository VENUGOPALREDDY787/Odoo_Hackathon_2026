import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../service/category.service';
import { createCategorySchema, updateCategorySchema } from '../validators/category.validators';
import ApiResponse from '../../../core/responses/ApiResponse';

export class CategoryController {
  private categoryService: CategoryService;

  constructor(categoryService = new CategoryService()) {
    this.categoryService = categoryService;
  }

  /**
   * Registers a new asset category.
   */
  createCategory = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const adminUser = (req as any).user;
    const validated = createCategorySchema.parse(req.body);
    const data = await this.categoryService.createCategory(adminUser.id, adminUser.organizationId, validated);
    ApiResponse.success(res, data, 'Asset category created successfully', 201);
  };

  /**
   * Updates category details and metadata fields.
   */
  updateCategory = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const adminUser = (req as any).user;
    const validated = updateCategorySchema.parse(req.body);
    const data = await this.categoryService.updateCategory(
      adminUser.id,
      adminUser.organizationId,
      req.params.id as string,
      validated
    );
    ApiResponse.success(res, data, 'Asset category updated successfully', 200);
  };

  /**
   * Deletes a category completely (restricted by active asset references).
   */
  deleteCategory = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const adminUser = (req as any).user;
    await this.categoryService.deleteCategory(adminUser.id, adminUser.organizationId, req.params.id as string);
    ApiResponse.success(res, null, 'Asset category deleted successfully', 200);
  };

  /**
   * Retrieves detail profile of a category.
   */
  getCategory = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const data = await this.categoryService.getCategory(user.organizationId, req.params.id as string);
    ApiResponse.success(res, data, 'Asset category retrieved successfully', 200);
  };

  /**
   * Lists all categories.
   */
  listCategories = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const data = await this.categoryService.listCategories(user.organizationId, req.query);
    ApiResponse.success(res, data, 'Asset categories retrieved successfully', 200);
  };
}
export default CategoryController;

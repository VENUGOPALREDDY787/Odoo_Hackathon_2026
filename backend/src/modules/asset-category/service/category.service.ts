import { CategoryRepository } from '../repository/category.repository';
import { CreateCategoryDTO, UpdateCategoryDTO } from '../dto/category.dto';
import { AppError } from '../../../core/errors/AppError';
import { logActivity } from '../../../utils/logger';
import { emitToOrg } from '../../../utils/socket';

export class CategoryService {
  private categoryRepository: CategoryRepository;

  constructor(categoryRepository = new CategoryRepository()) {
    this.categoryRepository = categoryRepository;
  }

  /**
   * Registers a new asset category, validating name uniqueness.
   */
  async createCategory(adminUserId: string, orgId: string, dto: CreateCategoryDTO) {
    const existing = await this.categoryRepository.findByName(orgId, dto.name);
    if (existing) {
      throw new AppError(`Asset category "${dto.name}" already exists.`, 409, 'DUPLICATE_CATEGORY_NAME');
    }

    const category = await this.categoryRepository.create({
      organization: { connect: { id: orgId } },
      name: dto.name,
      customFields: dto.customFields || undefined,
      createdBy: adminUserId
    });

    await logActivity({
      organizationId: orgId,
      userId: adminUserId,
      action: 'CATEGORY_CREATED',
      entityType: 'AssetCategory',
      entityId: category.id,
      details: { name: dto.name }
    });

    emitToOrg(orgId, 'category.created', category);

    return category;
  }

  /**
   * Updates category details and dynamic metadata fields.
   */
  async updateCategory(adminUserId: string, orgId: string, id: string, dto: UpdateCategoryDTO) {
    const category = await this.categoryRepository.findById(id, orgId);
    if (!category) {
      throw new AppError('Category not found.', 404, 'CATEGORY_NOT_FOUND');
    }

    const data: any = {};

    if (dto.name && dto.name !== category.name) {
      const existing = await this.categoryRepository.findByName(orgId, dto.name);
      if (existing) {
        throw new AppError(`Asset category "${dto.name}" already exists.`, 409, 'DUPLICATE_CATEGORY_NAME');
      }
      data.name = dto.name;
    }

    if (dto.customFields !== undefined) {
      data.customFields = dto.customFields || null;
    }

    const updated = await this.categoryRepository.update(id, data);

    await logActivity({
      organizationId: orgId,
      userId: adminUserId,
      action: 'CATEGORY_UPDATED',
      entityType: 'AssetCategory',
      entityId: id,
      details: dto
    });

    emitToOrg(orgId, 'category.updated', updated);

    return updated;
  }

  /**
   * Deletes a category completely, provided no assets currently reference it.
   */
  async deleteCategory(adminUserId: string, orgId: string, id: string) {
    const category = await this.categoryRepository.findById(id, orgId);
    if (!category) {
      throw new AppError('Category not found.', 404, 'CATEGORY_NOT_FOUND');
    }

    const assetsCount = await this.categoryRepository.countAssets(id);
    if (assetsCount > 0) {
      throw new AppError('Cannot delete category. Active assets are still assigned to it.', 400, 'ASSETS_ASSIGNED_TO_CATEGORY');
    }

    await this.categoryRepository.delete(id);

    await logActivity({
      organizationId: orgId,
      userId: adminUserId,
      action: 'CATEGORY_DELETED',
      entityType: 'AssetCategory',
      entityId: id,
      details: { name: category.name }
    });

    emitToOrg(orgId, 'category.deleted', { id });

    return true;
  }

  /**
   * Returns details of a specific category.
   */
  async getCategory(orgId: string, id: string) {
    const category = await this.categoryRepository.findById(id, orgId);
    if (!category) {
      throw new AppError('Category not found.', 404, 'CATEGORY_NOT_FOUND');
    }
    return category;
  }

  /**
   * Lists all categories.
   */
  async listCategories(orgId: string, query: any) {
    const filters: any = {};
    if (query.search) {
      filters.name = { contains: query.search };
    }

    return this.categoryRepository.findAll(orgId, filters);
  }
}
export default CategoryService;

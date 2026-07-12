import { CategoryService } from '../service/category.service';
import { CategoryRepository } from '../repository/category.repository';
import { AppError } from '../../../core/errors/AppError';
import { logActivity } from '../../../utils/logger';
import { emitToOrg } from '../../../utils/socket';

// Mock logs and sockets to keep tests silent and clean
jest.mock('../../../utils/logger', () => ({
  logActivity: jest.fn().mockResolvedValue(undefined)
}));
jest.mock('../../../utils/socket', () => ({
  emitToOrg: jest.fn()
}));
jest.mock('../repository/category.repository');

describe('CategoryService Unit Tests', () => {
  let categoryService: CategoryService;
  let mockCategoryRepository: jest.Mocked<CategoryRepository>;
  const adminUserId = 'admin-user-id';
  const orgId = 'org-id';

  beforeEach(() => {
    mockCategoryRepository = new CategoryRepository() as any;
    categoryService = new CategoryService(mockCategoryRepository);
    jest.clearAllMocks();
  });

  describe('createCategory', () => {
    it('should throw AppError if category name already exists', async () => {
      mockCategoryRepository.findByName.mockResolvedValue({ id: 'cat-1', name: 'Hardware' } as any);

      await expect(
        categoryService.createCategory(adminUserId, orgId, { name: 'Hardware' })
      ).rejects.toThrow(new AppError('Asset category "Hardware" already exists.', 409, 'DUPLICATE_CATEGORY_NAME'));
    });

    it('should create and return category if name is unique', async () => {
      const createdCategory = { id: 'cat-2', name: 'Software', customFields: null };
      mockCategoryRepository.findByName.mockResolvedValue(null);
      mockCategoryRepository.create.mockResolvedValue(createdCategory as any);

      const result = await categoryService.createCategory(adminUserId, orgId, { name: 'Software' });

      expect(result).toEqual(createdCategory);
      expect(mockCategoryRepository.create).toHaveBeenCalledWith({
        organization: { connect: { id: orgId } },
        name: 'Software',
        customFields: undefined,
        createdBy: adminUserId
      });
      expect(logActivity).toHaveBeenCalled();
      expect(emitToOrg).toHaveBeenCalledWith(orgId, 'category.created', createdCategory);
    });
  });

  describe('updateCategory', () => {
    it('should throw AppError if category does not exist', async () => {
      mockCategoryRepository.findById.mockResolvedValue(null);

      await expect(
        categoryService.updateCategory(adminUserId, orgId, 'invalid-id', { name: 'New Name' })
      ).rejects.toThrow(new AppError('Category not found.', 404, 'CATEGORY_NOT_FOUND'));
    });

    it('should throw AppError if category name is updated to an already existing name', async () => {
      mockCategoryRepository.findById.mockResolvedValue({ id: 'cat-1', name: 'Old Name' } as any);
      mockCategoryRepository.findByName.mockResolvedValue({ id: 'cat-2', name: 'Existing Name' } as any);

      await expect(
        categoryService.updateCategory(adminUserId, orgId, 'cat-1', { name: 'Existing Name' })
      ).rejects.toThrow(new AppError('Asset category "Existing Name" already exists.', 409, 'DUPLICATE_CATEGORY_NAME'));
    });

    it('should update and return category successfully', async () => {
      const existingCategory = { id: 'cat-1', name: 'Old Name', customFields: null };
      const updatedCategory = { id: 'cat-1', name: 'New Name', customFields: { version: '2.0' } };
      
      mockCategoryRepository.findById.mockResolvedValue(existingCategory as any);
      mockCategoryRepository.findByName.mockResolvedValue(null);
      mockCategoryRepository.update.mockResolvedValue(updatedCategory as any);

      const result = await categoryService.updateCategory(adminUserId, orgId, 'cat-1', {
        name: 'New Name',
        customFields: { version: '2.0' }
      });

      expect(result).toEqual(updatedCategory);
      expect(mockCategoryRepository.update).toHaveBeenCalledWith('cat-1', {
        name: 'New Name',
        customFields: { version: '2.0' }
      });
      expect(logActivity).toHaveBeenCalled();
      expect(emitToOrg).toHaveBeenCalledWith(orgId, 'category.updated', updatedCategory);
    });
  });

  describe('deleteCategory', () => {
    it('should throw AppError if category does not exist', async () => {
      mockCategoryRepository.findById.mockResolvedValue(null);

      await expect(
        categoryService.deleteCategory(adminUserId, orgId, 'invalid-id')
      ).rejects.toThrow(new AppError('Category not found.', 404, 'CATEGORY_NOT_FOUND'));
    });

    it('should throw AppError if active assets are still assigned to the category', async () => {
      mockCategoryRepository.findById.mockResolvedValue({ id: 'cat-1', name: 'Hardware' } as any);
      mockCategoryRepository.countAssets.mockResolvedValue(5);

      await expect(
        categoryService.deleteCategory(adminUserId, orgId, 'cat-1')
      ).rejects.toThrow(new AppError('Cannot delete category. Active assets are still assigned to it.', 400, 'ASSETS_ASSIGNED_TO_CATEGORY'));
    });

    it('should delete category successfully', async () => {
      mockCategoryRepository.findById.mockResolvedValue({ id: 'cat-1', name: 'Hardware' } as any);
      mockCategoryRepository.countAssets.mockResolvedValue(0);
      mockCategoryRepository.delete.mockResolvedValue(true as any);

      const result = await categoryService.deleteCategory(adminUserId, orgId, 'cat-1');

      expect(result).toBe(true);
      expect(mockCategoryRepository.delete).toHaveBeenCalledWith('cat-1');
      expect(logActivity).toHaveBeenCalled();
      expect(emitToOrg).toHaveBeenCalledWith(orgId, 'category.deleted', { id: 'cat-1' });
    });
  });

  describe('getCategory', () => {
    it('should throw AppError if category does not exist', async () => {
      mockCategoryRepository.findById.mockResolvedValue(null);

      await expect(
        categoryService.getCategory(orgId, 'invalid-id')
      ).rejects.toThrow(new AppError('Category not found.', 404, 'CATEGORY_NOT_FOUND'));
    });

    it('should return category details if found', async () => {
      const category = { id: 'cat-1', name: 'Hardware' };
      mockCategoryRepository.findById.mockResolvedValue(category as any);

      const result = await categoryService.getCategory(orgId, 'cat-1');

      expect(result).toEqual(category);
    });
  });

  describe('listCategories', () => {
    it('should list all categories with search query filters', async () => {
      const categories = [{ id: 'cat-1', name: 'Hardware' }];
      mockCategoryRepository.findAll.mockResolvedValue(categories as any);

      const result = await categoryService.listCategories(orgId, { search: 'Hard' });

      expect(result).toEqual(categories);
      expect(mockCategoryRepository.findAll).toHaveBeenCalledWith(orgId, {
        name: { contains: 'Hard' }
      });
    });
  });
});

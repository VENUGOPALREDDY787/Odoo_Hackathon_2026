import { CategoryService } from '../service/category.service';
import { CategoryRepository } from '../repository/category.repository';

// Mock the repository database access layer
jest.mock('../repository/category.repository');

describe('CategoryService Unit Tests', () => {
  let categoryService: CategoryService;
  let mockCategoryRepository: jest.Mocked<CategoryRepository>;

  beforeEach(() => {
    mockCategoryRepository = new CategoryRepository() as any;
    categoryService = new CategoryService(mockCategoryRepository);
  });

  describe('Initialization checks', () => {
    it('should be defined and instantiate dependency classes successfully', () => {
      expect(categoryService).toBeDefined();
      expect(mockCategoryRepository).toBeDefined();
    });
  });
});

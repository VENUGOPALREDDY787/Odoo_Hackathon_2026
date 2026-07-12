import { DepartmentService } from '../service/department.service';
import { DepartmentRepository } from '../repository/department.repository';

// Mock the repository database access layer
jest.mock('../repository/department.repository');

describe('DepartmentService Unit Tests', () => {
  let departmentService: DepartmentService;
  let mockDepartmentRepository: jest.Mocked<DepartmentRepository>;

  beforeEach(() => {
    mockDepartmentRepository = new DepartmentRepository() as any;
    departmentService = new DepartmentService(mockDepartmentRepository);
  });

  describe('Initialization checks', () => {
    it('should be defined and instantiate dependency classes successfully', () => {
      expect(departmentService).toBeDefined();
      expect(mockDepartmentRepository).toBeDefined();
    });
  });
});

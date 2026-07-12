import { MaintenanceRepository } from '../repository/maintenance.repository';
import { MaintenanceService } from '../service/maintenance.service';
import { MAINTENANCE_STATUSES, ALLOWED_TRANSITIONS } from '../constants/maintenance.constants';

jest.mock('../repository/maintenance.repository');

describe('Maintenance Workflow Tests', () => {
  let service: MaintenanceService;
  let mockRepo: jest.Mocked<MaintenanceRepository>;

  beforeEach(() => {
    mockRepo = new MaintenanceRepository() as any;
    service = new MaintenanceService(mockRepo);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Transition Matrix', () => {
    it('should allow Pending → Approved', () => {
      const allowed = ALLOWED_TRANSITIONS['Pending'];
      expect(allowed).toContain(MAINTENANCE_STATUSES.APPROVED);
    });

    it('should allow Approved → Technician Assigned', () => {
      const allowed = ALLOWED_TRANSITIONS['Approved'];
      expect(allowed).toContain(MAINTENANCE_STATUSES.TECHNICIAN_ASSIGNED);
    });

    it('should allow In Progress → Resolved', () => {
      const allowed = ALLOWED_TRANSITIONS['In Progress'];
      expect(allowed).toContain(MAINTENANCE_STATUSES.RESOLVED);
    });

    it('should NOT allow Resolved → Pending (invalid transition)', () => {
      const allowed = ALLOWED_TRANSITIONS['Resolved'];
      expect(allowed).not.toContain(MAINTENANCE_STATUSES.PENDING);
    });

    it('should NOT allow Closed → any status', () => {
      const allowed = ALLOWED_TRANSITIONS['Closed'];
      expect(allowed).toHaveLength(0);
    });

    it('should NOT allow Rejected → any status', () => {
      const allowed = ALLOWED_TRANSITIONS['Rejected'];
      expect(allowed).toHaveLength(0);
    });
  });
});

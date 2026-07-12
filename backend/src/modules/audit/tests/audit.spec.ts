import { AuditRepository } from '../repository/audit.repository';
import { AuditService } from '../service/audit.service';
import { AUDIT_STATUSES, ALLOWED_AUDIT_TRANSITIONS } from '../constants/audit.constants';

jest.mock('../repository/audit.repository');

describe('AuditService — Workflow Transition Tests', () => {
  let service: AuditService;
  let mockRepo: jest.Mocked<AuditRepository>;

  beforeEach(() => {
    mockRepo = new AuditRepository() as any;
    service = new AuditService(mockRepo);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Transition Matrix Integrity', () => {
    it('should allow Draft → Scheduled', () => {
      expect(ALLOWED_AUDIT_TRANSITIONS[AUDIT_STATUSES.DRAFT]).toContain(AUDIT_STATUSES.SCHEDULED);
    });

    it('should allow Scheduled → In Progress', () => {
      expect(ALLOWED_AUDIT_TRANSITIONS[AUDIT_STATUSES.SCHEDULED]).toContain(AUDIT_STATUSES.IN_PROGRESS);
    });

    it('should allow In Progress → Completed', () => {
      expect(ALLOWED_AUDIT_TRANSITIONS[AUDIT_STATUSES.IN_PROGRESS]).toContain(AUDIT_STATUSES.COMPLETED);
    });

    it('should allow Completed → Closed', () => {
      expect(ALLOWED_AUDIT_TRANSITIONS[AUDIT_STATUSES.COMPLETED]).toContain(AUDIT_STATUSES.CLOSED);
    });

    it('should NOT allow Closed → any status (immutable)', () => {
      expect(ALLOWED_AUDIT_TRANSITIONS[AUDIT_STATUSES.CLOSED]).toHaveLength(0);
    });

    it('should NOT allow Cancelled → any status (terminal)', () => {
      expect(ALLOWED_AUDIT_TRANSITIONS[AUDIT_STATUSES.CANCELLED]).toHaveLength(0);
    });

    it('should allow Draft → Cancelled', () => {
      expect(ALLOWED_AUDIT_TRANSITIONS[AUDIT_STATUSES.DRAFT]).toContain(AUDIT_STATUSES.CANCELLED);
    });

    it('should NOT allow Closed → In Progress', () => {
      expect(ALLOWED_AUDIT_TRANSITIONS[AUDIT_STATUSES.CLOSED]).not.toContain(AUDIT_STATUSES.IN_PROGRESS);
    });
  });
});

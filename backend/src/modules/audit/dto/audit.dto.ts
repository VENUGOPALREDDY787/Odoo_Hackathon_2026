export interface CreateAuditCycleDTO {
  name: string;
  description?: string | null;
  scopeType: 'All' | 'Department' | 'Location' | 'Category';
  scopeDepartmentId?: string | null;
  scopeLocation?: string | null;
  scopeCategoryId?: string | null;
  scheduledStartDate?: string | null;
  scheduledEndDate?: string | null;
  auditorIds?: string[];
}

export interface UpdateAuditCycleDTO {
  name?: string;
  description?: string | null;
  scheduledStartDate?: string | null;
  scheduledEndDate?: string | null;
}

export interface AssignAuditorsDTO {
  auditorIds: string[];
}

export interface VerifyAssetDTO {
  verificationStatus: 'Verified' | 'Missing' | 'Damaged' | 'Not Verified';
  notes?: string | null;
  physicalLocation?: string | null;
  conditionOnVerify?: 'Good' | 'Fair' | 'Poor' | 'Damaged' | null;
}

export interface AddEvidenceDTO {
  fileUrl: string;
  fileType: 'image' | 'pdf' | 'document';
  caption?: string | null;
}

export interface CancelAuditDTO {
  cancelReason: string;
}

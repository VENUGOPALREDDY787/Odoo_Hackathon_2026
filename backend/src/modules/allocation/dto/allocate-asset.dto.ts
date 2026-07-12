export interface AllocateAssetDTO {
  assetId: string;
  allocatedToType: 'Employee' | 'Department';
  employeeId?: string | null;
  departmentId?: string | null;
  expectedReturnDate?: string | null; // ISO Date String
}

export interface BulkAllocateDTO {
  allocations: Omit<AllocateAssetDTO, 'allocatedBy'>[];
}

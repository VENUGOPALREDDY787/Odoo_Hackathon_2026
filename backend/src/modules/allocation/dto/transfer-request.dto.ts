export interface TransferRequestDTO {
  assetId: string;
  toEmployeeId?: string | null;
  toDepartmentId?: string | null;
  requestNotes?: string | null;
}

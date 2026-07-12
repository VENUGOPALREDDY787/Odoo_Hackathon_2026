export interface CreateMaintenanceRequestDTO {
  assetId: string;
  issueDescription: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  photoUrl?: string | null;
  estimatedCompletionDate?: string | null;
  estimatedCost?: number | null;
  vendor?: string | null;
}

export interface UpdateMaintenanceRequestDTO {
  issueDescription?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  photoUrl?: string | null;
  estimatedCompletionDate?: string | null;
  estimatedCost?: number | null;
  vendor?: string | null;
}

export interface ApproveMaintenanceDTO {
  assignedTechnician?: string | null;
  estimatedCompletionDate?: string | null;
  estimatedCost?: number | null;
  vendor?: string | null;
}

export interface RejectMaintenanceDTO {
  rejectionReason: string;
}

export interface AssignTechnicianDTO {
  assignedTechnician: string;
}

export interface CompleteMaintenanceDTO {
  resolutionNotes: string;
  actualCost?: number | null;
  actualCompletionDate?: string | null;
}

export interface CancelMaintenanceDTO {
  cancelReason: string;
}

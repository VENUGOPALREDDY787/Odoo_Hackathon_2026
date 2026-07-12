export interface CreateBookingDTO {
  assetId: string;
  startTime: string;    // ISO 8601 datetime string
  endTime: string;      // ISO 8601 datetime string
  notes?: string | null;
  bookedOnBehalfOfDeptId?: string | null;
}

export interface UpdateBookingDTO {
  startTime?: string;
  endTime?: string;
  notes?: string | null;
  bookedOnBehalfOfDeptId?: string | null;
}

export interface RescheduleBookingDTO {
  startTime: string;
  endTime: string;
  reason?: string | null;
}

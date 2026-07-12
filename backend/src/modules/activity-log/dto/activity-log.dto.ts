import { ActivityAction, ActivityModule } from '../constants/activity-log.constants';

export interface CreateActivityLogDTO {
  userId?: string | null;
  action: ActivityAction | string;
  module: ActivityModule | string;
  entityType: string;
  entityId?: string | null;
  oldValue?: any | null;
  newValue?: any | null;
  departmentId?: string | null;
  ipAddress?: string | null;
  browser?: string | null;
  device?: string | null;
  requestId?: string | null;
}

export interface ActivityLogQueryDTO {
  userId?: string;
  action?: string;
  module?: string;
  entityType?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

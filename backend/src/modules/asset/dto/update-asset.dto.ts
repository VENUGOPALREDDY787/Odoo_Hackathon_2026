export interface UpdateAssetDTO {
  name?: string;
  categoryId?: string;
  serialNumber?: string | null;
  acquisitionDate?: string;
  acquisitionCost?: number;
  condition?: 'Excellent' | 'Good' | 'Fair' | 'Damaged' | 'Lost' | 'Disposed';
  location?: string;
  status?: 'Available' | 'Allocated' | 'Reserved' | 'Under Maintenance' | 'Lost' | 'Retired' | 'Disposed';
  isShared?: boolean;
  imageUrl?: string | null;
  documentsUrl?: string | null;
  warrantyExpiry?: string | null;
  maintenanceFrequency?: string | null;
  manufacturer?: string | null;
  modelNumber?: string | null;
  vendor?: string | null;
  description?: string | null;
  customMetadata?: Record<string, any> | null;
}

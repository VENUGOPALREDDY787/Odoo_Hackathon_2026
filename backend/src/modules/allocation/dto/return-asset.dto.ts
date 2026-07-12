export interface ReturnAssetDTO {
  returnCondition: 'Excellent' | 'Good' | 'Fair' | 'Damaged' | 'Lost' | 'Disposed';
  returnNotes?: string | null;
}

export interface BulkReturnDTO {
  assetIds: string[];
  returnCondition: 'Excellent' | 'Good' | 'Fair' | 'Damaged' | 'Lost' | 'Disposed';
  returnNotes?: string | null;
}

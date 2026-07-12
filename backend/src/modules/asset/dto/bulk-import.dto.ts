import { CreateAssetDTO } from './create-asset.dto';

export interface BulkImportDTO {
  assets: CreateAssetDTO[];
}

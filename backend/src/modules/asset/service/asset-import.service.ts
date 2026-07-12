import { CreateAssetDTO } from '../dto/create-asset.dto';

export class AssetImportService {
  /**
   * Parses CSV string contents into clean arrays of Partial<CreateAssetDTO>.
   */
  parseCSV(csvText: string): Partial<CreateAssetDTO>[] {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length <= 1) {
      return [];
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const results: Partial<CreateAssetDTO>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      const obj: any = {};

      headers.forEach((header, index) => {
        const val = values[index];
        if (val !== undefined && val !== '') {
          if (header === 'acquisitionCost') {
            obj[header] = parseFloat(val);
          } else if (header === 'isShared') {
            obj[header] = val.toLowerCase() === 'true' || val === '1';
          } else {
            obj[header] = val;
          }
        }
      });
      results.push(obj);
    }
    return results;
  }
}

export const assetImportService = new AssetImportService();
export default assetImportService;

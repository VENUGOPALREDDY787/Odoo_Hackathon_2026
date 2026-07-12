export class AssetExportService {
  /**
   * Formats lists of assets into standard CSV download strings.
   */
  convertToCSV(assets: any[]): string {
    const headers = [
      'id',
      'assetTag',
      'name',
      'serialNumber',
      'acquisitionDate',
      'acquisitionCost',
      'condition',
      'location',
      'status',
      'isShared',
      'categoryId',
      'departmentId'
    ];

    const csvRows = [headers.join(',')];

    for (const asset of assets) {
      const row = headers.map(header => {
        const val = asset[header];
        if (val === null || val === undefined) {
          return '';
        }

        const rawString = val instanceof Date ? val.toISOString() : String(val);
        // Escape quotes to maintain CSV specification integrity
        return `"${rawString.replace(/"/g, '""')}"`;
      });
      csvRows.push(row.join(','));
    }

    return csvRows.join('\n');
  }
}

export const assetExportService = new AssetExportService();
export default assetExportService;

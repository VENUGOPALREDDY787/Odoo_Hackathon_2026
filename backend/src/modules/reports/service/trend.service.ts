import { ReportFilterDTO } from '../dto/reports.dto';

export class TrendService {
  /**
   * Filter and aggregate raw date-based datasets based on calendar horizons (Year, Quarter, Month, Week).
   */
  filterByHorizon(data: any[], dateField: string, filters: ReportFilterDTO): any[] {
    let filtered = [...data];

    if (filters.year) {
      filtered = filtered.filter(item => {
        const d = new Date(item[dateField]);
        return d.getUTCFullYear() === filters.year;
      });
    }

    if (filters.quarter) {
      filtered = filtered.filter(item => {
        const d = new Date(item[dateField]);
        const q = Math.floor(d.getUTCMonth() / 3) + 1;
        return q === filters.quarter;
      });
    }

    if (filters.month) {
      filtered = filtered.filter(item => {
        const d = new Date(item[dateField]);
        return (d.getUTCMonth() + 1) === filters.month;
      });
    }

    return filtered;
  }
}

export default TrendService;

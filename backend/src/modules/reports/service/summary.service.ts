import { AnalyticsService } from './analytics.service';

export class SummaryService {
  private analyticsService: AnalyticsService;

  constructor(
    analyticsService = new AnalyticsService()
  ) {
    this.analyticsService = analyticsService;
  }

  /**
   * Generates a comprehensive corporate operational executive summary.
   */
  async getExecutiveSummary(orgId: string) {
    const [availability, reliability, topDepts, growth] = await Promise.all([
      this.analyticsService.getAssetAvailability(orgId),
      this.analyticsService.getAssetReliability(orgId),
      this.analyticsService.getTopDepartments(orgId),
      this.analyticsService.getAssetGrowth(orgId)
    ]);

    return {
      generatedAt: new Date().toISOString(),
      availability,
      reliability: reliability.slice(0, 5),
      topDepartments: topDepts,
      assetGrowthOverTime: growth.slice(-6) // Last 6 months
    };
  }
}

export default SummaryService;

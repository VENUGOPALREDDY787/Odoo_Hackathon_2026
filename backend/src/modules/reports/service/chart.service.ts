import { MetricDataPoint } from '../dto/reports.dto';

export class ChartService {
  /**
   * Generates a text-based ASCII bar chart.
   * Perfect for simple console rendering or inclusion in text/CSV reports.
   */
  generateBarChart(data: MetricDataPoint[]): string {
    if (data.length === 0) return 'No data available';
    const maxVal = Math.max(...data.map(d => d.value), 1);
    const maxLabelLen = Math.max(...data.map(d => d.label.length), 0);
    const width = 30; // Max bar width

    return data
      .map(d => {
        const barLen = Math.round((d.value / maxVal) * width);
        const bar = '█'.repeat(barLen) + '░'.repeat(width - barLen);
        const label = d.label.padEnd(maxLabelLen, ' ');
        return `${label} | ${bar} (${d.value})`;
      })
      .join('\n');
  }
}

export default ChartService;

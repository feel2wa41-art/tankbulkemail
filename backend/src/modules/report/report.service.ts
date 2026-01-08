import { Injectable } from '@nestjs/common';

@Injectable()
export class ReportService {
  async getSummary(range: string) {
    // TODO: Implement
    return {
      success: true,
      data: {
        totalSent: 0,
        successCount: 0,
        failCount: 0,
        successRate: 0,
      },
    };
  }

  async getDomainStats(range: string) {
    // TODO: Implement
    return { success: true, data: [] };
  }

  async getTimeline(range: string) {
    // TODO: Implement
    return { success: true, data: [] };
  }
}

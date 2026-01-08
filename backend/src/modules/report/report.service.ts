/**
 * Report Service
 * 리포트/통계 비즈니스 로직
 */
import { Injectable } from '@nestjs/common';
import { LogRepository } from '../log/repositories/log.repository';
import { DatabaseService } from '../../config/database.service';

@Injectable()
export class ReportService {
  constructor(
    private readonly logRepository: LogRepository,
    private readonly databaseService: DatabaseService,
  ) {}

  async getSummary(range: string = '30d', orgId?: number) {
    if (!this.databaseService.isConnected()) {
      return this.getDevSummary();
    }

    try {
      const stats = await this.logRepository.getSummaryStats(orgId);

      const totalSent = stats?.TOTAL_SENT || 0;
      const successCount = stats?.SUCCESS_COUNT || 0;
      const failCount = stats?.FAIL_COUNT || 0;
      const automationCount = stats?.AUTOMATION_COUNT || 0;

      return {
        success: true,
        data: {
          totalSent,
          successCount,
          failCount,
          successRate: totalSent > 0 ? Math.round((successCount / totalSent) * 100) : 0,
          automationCount,
          period: range,
        },
      };
    } catch (error) {
      if (this.isDbConnectionError(error)) {
        return this.getDevSummary();
      }
      throw error;
    }
  }

  async getDomainStats(range: string = '30d', orgId?: number) {
    if (!this.databaseService.isConnected()) {
      return this.getDevDomainStats();
    }

    try {
      const { startDate, endDate } = this.parseDateRange(range);
      const stats = await this.logRepository.getEmailStatsByDomain(startDate, endDate, orgId);

      return {
        success: true,
        data: stats.map((stat: any) => ({
          domain: stat.DOMAIN,
          totalCount: stat.TOTAL_COUNT,
          successCount: stat.SUCCESS_COUNT,
          failCount: stat.FAIL_COUNT,
          successRate: stat.TOTAL_COUNT > 0
            ? Math.round((stat.SUCCESS_COUNT / stat.TOTAL_COUNT) * 100)
            : 0,
        })),
      };
    } catch (error) {
      if (this.isDbConnectionError(error)) {
        return this.getDevDomainStats();
      }
      throw error;
    }
  }

  async getTimeline(range: string = '30d', orgId?: number) {
    if (!this.databaseService.isConnected()) {
      return this.getDevTimeline();
    }

    try {
      const { startDate, endDate } = this.parseDateRange(range);
      const stats = await this.logRepository.getEmailStatsByDate(startDate, endDate, orgId);

      return {
        success: true,
        data: stats.map((stat: any) => ({
          date: stat.SEND_DATE,
          totalCount: stat.TOTAL_COUNT,
          successCount: stat.SUCCESS_COUNT,
          failCount: stat.FAIL_COUNT,
        })),
      };
    } catch (error) {
      if (this.isDbConnectionError(error)) {
        return this.getDevTimeline();
      }
      throw error;
    }
  }

  private parseDateRange(range: string): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    const match = range.match(/^(\d+)([dwmy])$/);
    if (match) {
      const value = parseInt(match[1], 10);
      const unit = match[2];

      switch (unit) {
        case 'd':
          startDate.setDate(startDate.getDate() - value);
          break;
        case 'w':
          startDate.setDate(startDate.getDate() - value * 7);
          break;
        case 'm':
          startDate.setMonth(startDate.getMonth() - value);
          break;
        case 'y':
          startDate.setFullYear(startDate.getFullYear() - value);
          break;
      }
    } else {
      // 기본값: 30일
      startDate.setDate(startDate.getDate() - 30);
    }

    return { startDate, endDate };
  }

  private isDbConnectionError(error: any): boolean {
    return error.message?.includes('NJS-') ||
           error.message?.includes('ORA-') ||
           error.message?.includes('connection');
  }

  private getDevSummary() {
    return {
      success: true,
      message: 'Development mode - no database connection',
      data: {
        totalSent: 1250,
        successCount: 1180,
        failCount: 70,
        successRate: 94,
        automationCount: 5,
        period: '30d',
      },
    };
  }

  private getDevDomainStats() {
    return {
      success: true,
      message: 'Development mode - no database connection',
      data: [
        { domain: 'gmail.com', totalCount: 450, successCount: 440, failCount: 10, successRate: 98 },
        { domain: 'naver.com', totalCount: 320, successCount: 310, failCount: 10, successRate: 97 },
        { domain: 'daum.net', totalCount: 180, successCount: 170, failCount: 10, successRate: 94 },
        { domain: 'kakao.com', totalCount: 150, successCount: 140, failCount: 10, successRate: 93 },
        { domain: 'outlook.com', totalCount: 100, successCount: 90, failCount: 10, successRate: 90 },
      ],
    };
  }

  private getDevTimeline() {
    const data = [];
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const totalCount = Math.floor(Math.random() * 50) + 30;
      const successCount = Math.floor(totalCount * (0.9 + Math.random() * 0.08));

      data.push({
        date: date.toISOString().split('T')[0],
        totalCount,
        successCount,
        failCount: totalCount - successCount,
      });
    }

    return {
      success: true,
      message: 'Development mode - no database connection',
      data,
    };
  }
}

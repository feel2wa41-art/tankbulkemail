import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportService } from './report.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Report')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get summary report' })
  async getSummary(@Query('range') range: string = '7d') {
    return this.reportService.getSummary(range);
  }

  @Get('domain-stats')
  @ApiOperation({ summary: 'Get domain statistics' })
  async getDomainStats(@Query('range') range: string = '30d') {
    return this.reportService.getDomainStats(range);
  }

  @Get('timeline')
  @ApiOperation({ summary: 'Get timeline data' })
  async getTimeline(@Query('range') range: string = '1d') {
    return this.reportService.getTimeline(range);
  }
}

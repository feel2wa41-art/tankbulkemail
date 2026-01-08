import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LogService } from './log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Log')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('log')
export class LogController {
  constructor(private readonly logService: LogService) {}

  @Get('automation')
  @ApiOperation({ summary: 'Get automation run logs' })
  async getAutomationLogs(
    @Query('orgId') orgId?: number,
    @Query('automationId') automationId?: number,
  ) {
    return this.logService.getAutomationLogs(orgId, automationId);
  }

  @Get('email')
  @ApiOperation({ summary: 'Get email send logs' })
  async getEmailLogs(@Query('runId') runId: number) {
    return this.logService.getEmailLogs(runId);
  }

  @Get('system')
  @ApiOperation({ summary: 'Get system error logs' })
  async getSystemLogs() {
    return this.logService.getSystemLogs();
  }
}

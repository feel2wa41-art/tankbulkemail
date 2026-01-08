import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
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
  @ApiQuery({ name: 'orgId', required: false })
  @ApiQuery({ name: 'autoId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getAutomationLogs(
    @Query('orgId') orgId?: number,
    @Query('autoId') autoId?: number,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
  ) {
    return this.logService.getAutomationLogs({ orgId, autoId, status, limit });
  }

  @Get('email')
  @ApiOperation({ summary: 'Get email send logs' })
  @ApiQuery({ name: 'runId', required: false })
  @ApiQuery({ name: 'autoId', required: false })
  @ApiQuery({ name: 'orgId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getEmailLogs(
    @Query('runId') runId?: number,
    @Query('autoId') autoId?: number,
    @Query('orgId') orgId?: number,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
  ) {
    return this.logService.getEmailLogs({ autoId, orgId, status, limit });
  }

  @Get('system')
  @ApiOperation({ summary: 'Get system error logs' })
  @ApiQuery({ name: 'autoId', required: false })
  @ApiQuery({ name: 'orgId', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getSystemLogs(
    @Query('autoId') autoId?: number,
    @Query('orgId') orgId?: number,
    @Query('limit') limit?: number,
  ) {
    return this.logService.getSystemLogs({ autoId, orgId, limit });
  }
}

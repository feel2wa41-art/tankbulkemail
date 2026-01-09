/**
 * Worker Controller
 * Worker 상태 확인 및 관리 API
 */
import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WorkerService } from './worker.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Worker')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('worker')
export class WorkerController {
  constructor(private readonly workerService: WorkerService) {}

  @Get('health')
  @ApiOperation({ summary: 'Check worker health status' })
  async checkHealth() {
    const health = await this.workerService.checkHealth();

    return {
      success: true,
      data: health,
    };
  }

  @Get('quota')
  @ApiOperation({ summary: 'Get SES sending quota' })
  async getQuota() {
    const quota = await this.workerService.getSesQuota();

    return {
      success: quota !== null,
      data: quota,
    };
  }

  @Get('queue/status')
  @ApiOperation({ summary: 'Get queue status' })
  async getQueueStatus() {
    return this.workerService.getQueueStatus();
  }

  @Get('queue/failed')
  @ApiOperation({ summary: 'Get failed jobs' })
  @ApiQuery({ name: 'autoId', required: false })
  async getFailedJobs(@Query('autoId') autoId?: string) {
    const parsedAutoId = autoId ? parseInt(autoId, 10) : undefined;
    return this.workerService.getFailedJobs(parsedAutoId);
  }

  @Post('queue/retry/:jobId')
  @ApiOperation({ summary: 'Retry a specific failed job' })
  async retryJob(@Param('jobId') jobId: string) {
    return this.workerService.retryJob(jobId);
  }

  @Post('queue/retry-all')
  @ApiOperation({ summary: 'Retry all failed jobs' })
  @ApiQuery({ name: 'autoId', required: false })
  async retryAllJobs(@Query('autoId') autoId?: string) {
    const parsedAutoId = autoId ? parseInt(autoId, 10) : undefined;
    return this.workerService.retryAllJobs(parsedAutoId);
  }
}

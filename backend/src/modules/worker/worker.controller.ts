/**
 * Worker Controller
 * Worker 상태 확인 및 관리 API
 */
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
}

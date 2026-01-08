/**
 * Scheduler Controller
 * 스케줄러 API 엔드포인트
 */
import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SchedulerService } from './scheduler.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateSchedulerDto } from './dto';

@ApiTags('Scheduler')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('scheduler')
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Get()
  @ApiOperation({ summary: 'Get all schedules' })
  @ApiQuery({ name: 'autoId', required: false, description: 'Filter by automation ID' })
  async findAll(@Query('autoId') autoId?: number) {
    if (autoId) {
      return this.schedulerService.findByAutoId(autoId);
    }
    return this.schedulerService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create schedule' })
  async create(@Body() dto: CreateSchedulerDto) {
    return this.schedulerService.create(dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete schedule' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.schedulerService.remove(id);
  }
}

import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SchedulerService } from './scheduler.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Scheduler')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('scheduler')
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Get()
  @ApiOperation({ summary: 'Get all schedules' })
  async findAll() {
    return this.schedulerService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create schedule' })
  async create(@Body() dto: any) {
    return this.schedulerService.create(dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete schedule' })
  async remove(@Param('id') id: number) {
    return this.schedulerService.remove(id);
  }
}

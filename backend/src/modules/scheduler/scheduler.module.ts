import { Module } from '@nestjs/common';
import { SchedulerController } from './scheduler.controller';
import { SchedulerService } from './scheduler.service';
import { SchedulerRepository } from './repositories/scheduler.repository';

@Module({
  controllers: [SchedulerController],
  providers: [SchedulerService, SchedulerRepository],
  exports: [SchedulerService, SchedulerRepository],
})
export class SchedulerModule {}

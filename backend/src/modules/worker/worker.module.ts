/**
 * Worker Module
 * Worker 엔진 통신 모듈
 */
import { Module, Global } from '@nestjs/common';
import { WorkerService } from './worker.service';
import { WorkerController } from './worker.controller';

@Global()
@Module({
  providers: [WorkerService],
  controllers: [WorkerController],
  exports: [WorkerService],
})
export class WorkerModule {}

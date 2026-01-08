import { Module } from '@nestjs/common';
import { LogController } from './log.controller';
import { LogService } from './log.service';
import { LogRepository } from './repositories/log.repository';

@Module({
  controllers: [LogController],
  providers: [LogService, LogRepository],
  exports: [LogService, LogRepository],
})
export class LogModule {}

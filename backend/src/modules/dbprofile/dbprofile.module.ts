/**
 * DB Profile Module
 * 데이터베이스 연결 프로필 관리 모듈
 */
import { Module } from '@nestjs/common';
import { DbProfileController } from './dbprofile.controller';
import { DbProfileService } from './dbprofile.service';
import { DbProfileRepository } from './repositories/dbprofile.repository';
import { DatabaseModule } from '../../config/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [DbProfileController],
  providers: [DbProfileService, DbProfileRepository],
  exports: [DbProfileService],
})
export class DbProfileModule {}

import { Module } from '@nestjs/common';
import { DbProfileController } from './dbprofile.controller';
import { DbProfileService } from './dbprofile.service';

@Module({
  controllers: [DbProfileController],
  providers: [DbProfileService],
  exports: [DbProfileService],
})
export class DbProfileModule {}

import { Module } from '@nestjs/common';
import { OrgController } from './org.controller';
import { OrgService } from './org.service';
import { OrgRepository } from './repositories/org.repository';

@Module({
  controllers: [OrgController],
  providers: [OrgService, OrgRepository],
  exports: [OrgService, OrgRepository],
})
export class OrgModule {}

import { Module, Global, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from './database.service';

@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly databaseService: DatabaseService) {}

  async onModuleInit() {
    await this.databaseService.initialize();
  }

  async onModuleDestroy() {
    await this.databaseService.close();
  }
}

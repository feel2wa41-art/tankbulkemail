/**
 * Tank Bulk Email System - Root Application Module
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

// Config
import { LoggerModule } from './config/logger.module';
import { DatabaseModule } from './config/database.module';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { OrgModule } from './modules/org/org.module';
import { DbProfileModule } from './modules/dbprofile/dbprofile.module';
import { AutomationModule } from './modules/automation/automation.module';
import { EmailModule } from './modules/email/email.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { LogModule } from './modules/log/log.module';
import { ReportModule } from './modules/report/report.module';
import { StorageModule } from './modules/storage/storage.module';
import { HealthModule } from './modules/health/health.module';
import { WorkerModule } from './modules/worker/worker.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate Limiting
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 1 minute
        limit: 100,
      },
    ]),

    // Logger
    LoggerModule,

    // Database
    DatabaseModule,

    // Feature Modules
    AuthModule,
    OrgModule,
    DbProfileModule,
    AutomationModule,
    EmailModule,
    SchedulerModule,
    LogModule,
    ReportModule,
    StorageModule,
    HealthModule,
    WorkerModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

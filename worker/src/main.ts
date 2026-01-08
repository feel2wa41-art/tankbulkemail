/**
 * Tank Bulk Email System - Worker/Scheduler Engine
 * Entry Point
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createLogger } from './config/logger';
import { SchedulerService } from './services/scheduler.service';
import { createManualTriggerServer } from './services/trigger.service';

const logger = createLogger('Main');

async function bootstrap() {
  logger.info('Starting Tank Worker Engine...');

  // Initialize scheduler
  const schedulerEnabled = process.env.SCHEDULER_ENABLED === 'true';
  if (schedulerEnabled) {
    const scheduler = new SchedulerService();
    await scheduler.start();
    logger.info('Scheduler started');
  } else {
    logger.info('Scheduler is disabled (DEV mode)');
  }

  // Start manual trigger server
  const port = parseInt(process.env.MANUAL_TRIGGER_PORT || '3002', 10);
  createManualTriggerServer(port);
  logger.info(`Manual trigger server started on port ${port}`);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    process.exit(0);
  });

  logger.info('Tank Worker Engine started successfully');
}

bootstrap().catch((error) => {
  logger.error('Failed to start worker engine:', error);
  process.exit(1);
});

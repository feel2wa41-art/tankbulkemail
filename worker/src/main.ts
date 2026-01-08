/**
 * Tank Bulk Email System - Worker/Scheduler Engine
 * Entry Point
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createLogger } from './config/logger';
import { SchedulerService } from './services/scheduler.service';
import { createManualTriggerServer } from './services/trigger.service';
import { closeQueues, getRedisConnection } from './config/queue';

const logger = createLogger('Main');

let scheduler: SchedulerService | null = null;

async function bootstrap() {
  logger.info('='.repeat(50));
  logger.info('Starting Tank Worker Engine...');
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`DEV Mode: ${process.env.DEV_MODE || 'false'}`);
  logger.info('='.repeat(50));

  // Test Redis connection
  try {
    const redis = getRedisConnection();
    await redis.ping();
    logger.info('Redis connection established');
  } catch (error: any) {
    logger.error('Failed to connect to Redis:', error.message);
    if (process.env.NODE_ENV !== 'development') {
      throw error;
    }
    logger.warn('Continuing without Redis in development mode');
  }

  // Initialize scheduler
  const schedulerEnabled = process.env.SCHEDULER_ENABLED === 'true';
  scheduler = new SchedulerService();

  if (schedulerEnabled) {
    await scheduler.start();
    logger.info('Scheduler started');
  } else {
    logger.info('Scheduler is disabled - manual triggers only');
  }

  // Start manual trigger server
  const port = parseInt(process.env.MANUAL_TRIGGER_PORT || '3002', 10);
  createManualTriggerServer(port);

  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);

    try {
      if (scheduler) {
        await scheduler.stop();
      }
      await closeQueues();
      logger.info('Cleanup completed');
    } catch (error) {
      logger.error('Error during shutdown:', error);
    }

    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  logger.info('='.repeat(50));
  logger.info('Tank Worker Engine started successfully');
  logger.info(`Manual trigger endpoint: http://localhost:${port}/trigger/{autoId}`);
  logger.info(`Health check endpoint: http://localhost:${port}/health`);
  logger.info('='.repeat(50));
}

bootstrap().catch((error) => {
  logger.error('Failed to start worker engine:', error);
  process.exit(1);
});

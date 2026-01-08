/**
 * BullMQ Queue Configuration
 * Redis 기반 작업 큐 설정
 */
import { Queue, Worker, Job } from 'bullmq';
import Redis, { RedisOptions as IORedisOptions } from 'ioredis';
import { createLogger } from './logger';

const logger = createLogger('Queue');

// Redis connection configuration
const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

// BullMQ connection config (uses its own type internally)
const bullmqConnection = {
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  maxRetriesPerRequest: null,
};

// IORedis config for health checks
const ioredisConfig: IORedisOptions = {
  host: redisHost,
  port: redisPort,
  password: redisPassword,
};

// Separate Redis instance for health checks and direct commands
let healthCheckRedis: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!healthCheckRedis) {
    healthCheckRedis = new Redis(ioredisConfig);

    healthCheckRedis.on('connect', () => {
      logger.info('Redis connected');
    });

    healthCheckRedis.on('error', (err) => {
      logger.error('Redis connection error:', err);
    });
  }
  return healthCheckRedis;
}

// Queue names
export const QUEUE_NAMES = {
  EMAIL_JOBS: 'email-jobs',
  EMAIL_SEND: 'email-send',
} as const;

// Job types
export interface EmailJobData {
  autoId: number;
  schedulerId?: number;
  runId: number;
  triggeredBy: 'scheduler' | 'manual' | 'api';
  triggeredAt: string;
}

export interface EmailSendData {
  runId: number;
  autoId: number;
  targetId: string;
  email: string;
  subject: string;
  htmlBody: string;
  senderEmail: string;
  senderName: string;
  attachmentPath?: string;
}

// Queue instances
let emailJobQueue: Queue<EmailJobData> | null = null;
let emailSendQueue: Queue<EmailSendData> | null = null;

export function getEmailJobQueue(): Queue<EmailJobData> {
  if (!emailJobQueue) {
    emailJobQueue = new Queue<EmailJobData>(QUEUE_NAMES.EMAIL_JOBS, {
      connection: bullmqConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    });
    logger.info('Email job queue initialized');
  }
  return emailJobQueue;
}

export function getEmailSendQueue(): Queue<EmailSendData> {
  if (!emailSendQueue) {
    emailSendQueue = new Queue<EmailSendData>(QUEUE_NAMES.EMAIL_SEND, {
      connection: bullmqConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: { count: 10000 },
        removeOnFail: { count: 50000 },
      },
    });
    logger.info('Email send queue initialized');
  }
  return emailSendQueue;
}

// Create worker for processing email jobs
export function createEmailJobWorker(
  processor: (job: Job<EmailJobData>) => Promise<void>
): Worker<EmailJobData> {
  const concurrency = parseInt(process.env.MAX_PARALLEL_JOBS || '5', 10);

  const worker = new Worker<EmailJobData>(
    QUEUE_NAMES.EMAIL_JOBS,
    processor,
    {
      connection: bullmqConnection,
      concurrency,
    }
  );

  worker.on('completed', (job) => {
    logger.info(`Job ${job.id} completed for automation ${job.data.autoId}`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed:`, err);
  });

  worker.on('error', (err) => {
    logger.error('Worker error:', err);
  });

  logger.info(`Email job worker created with concurrency: ${concurrency}`);
  return worker;
}

// Create worker for sending individual emails
export function createEmailSendWorker(
  processor: (job: Job<EmailSendData>) => Promise<void>
): Worker<EmailSendData> {
  const rateLimit = parseInt(process.env.SES_RATE_LIMIT || '14', 10);

  const worker = new Worker<EmailSendData>(
    QUEUE_NAMES.EMAIL_SEND,
    processor,
    {
      connection: bullmqConnection,
      concurrency: rateLimit,
      limiter: {
        max: rateLimit,
        duration: 1000, // per second
      },
    }
  );

  worker.on('completed', (job) => {
    logger.debug(`Email sent to ${job.data.email}`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Email send failed to ${job?.data.email}:`, err);
  });

  logger.info(`Email send worker created with rate limit: ${rateLimit}/sec`);
  return worker;
}

// Cleanup function
export async function closeQueues(): Promise<void> {
  if (emailJobQueue) {
    await emailJobQueue.close();
    emailJobQueue = null;
  }
  if (emailSendQueue) {
    await emailSendQueue.close();
    emailSendQueue = null;
  }
  if (healthCheckRedis) {
    await healthCheckRedis.quit();
    healthCheckRedis = null;
  }
  logger.info('All queues closed');
}

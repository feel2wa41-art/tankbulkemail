/**
 * BullMQ Queue Configuration
 * Redis 기반 작업 큐 설정
 * DEV_MODE에서는 Mock Queue 사용
 */
import { Queue, Worker, Job } from 'bullmq';
import Redis, { RedisOptions as IORedisOptions } from 'ioredis';
import { createLogger } from './logger';

const logger = createLogger('Queue');

const devMode = process.env.DEV_MODE === 'true';

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

// Mock Redis for DEV_MODE
class MockRedis {
  async ping(): Promise<string> {
    return 'PONG';
  }

  on(event: string, callback: (...args: any[]) => void): this {
    if (event === 'connect') {
      setTimeout(() => callback(), 0);
    }
    return this;
  }

  async quit(): Promise<'OK'> {
    return 'OK';
  }
}

export function getRedisConnection(): Redis {
  if (devMode) {
    logger.debug('Using mock Redis in DEV_MODE');
    return new MockRedis() as unknown as Redis;
  }

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

// Mock Queue for DEV_MODE
class MockQueue<T> {
  private name: string;
  private jobCounter = 0;

  constructor(name: string) {
    this.name = name;
    logger.info(`[DEV MODE] Mock ${name} queue initialized`);
  }

  async add(jobName: string, data: T, opts?: any): Promise<{ id: string; data: T }> {
    this.jobCounter++;
    const jobId = `mock-job-${this.jobCounter}`;
    logger.debug(`[DEV MODE] Job added to ${this.name}: ${jobName} (id: ${jobId})`);
    return { id: jobId, data };
  }

  async close(): Promise<void> {
    logger.debug(`[DEV MODE] Mock ${this.name} queue closed`);
  }
}

export function getEmailJobQueue(): Queue<EmailJobData> {
  if (devMode) {
    if (!emailJobQueue) {
      emailJobQueue = new MockQueue<EmailJobData>(QUEUE_NAMES.EMAIL_JOBS) as unknown as Queue<EmailJobData>;
    }
    return emailJobQueue;
  }

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
  if (devMode) {
    if (!emailSendQueue) {
      emailSendQueue = new MockQueue<EmailSendData>(QUEUE_NAMES.EMAIL_SEND) as unknown as Queue<EmailSendData>;
    }
    return emailSendQueue;
  }

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

// Mock Worker for DEV_MODE
class MockWorker<T> {
  private name: string;

  constructor(name: string, processor: (job: Job<T>) => Promise<void>) {
    this.name = name;
    logger.info(`[DEV MODE] Mock ${name} worker created`);
  }

  on(event: string, callback: (...args: any[]) => void): this {
    return this;
  }

  async close(): Promise<void> {
    logger.debug(`[DEV MODE] Mock ${this.name} worker closed`);
  }
}

// Create worker for processing email jobs
export function createEmailJobWorker(
  processor: (job: Job<EmailJobData>) => Promise<void>
): Worker<EmailJobData> {
  if (devMode) {
    logger.info('[DEV MODE] Email job worker (mock) - jobs will be logged but not processed');
    return new MockWorker<EmailJobData>(QUEUE_NAMES.EMAIL_JOBS, processor) as unknown as Worker<EmailJobData>;
  }

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
  if (devMode) {
    logger.info('[DEV MODE] Email send worker (mock) - emails will be logged but not sent');
    return new MockWorker<EmailSendData>(QUEUE_NAMES.EMAIL_SEND, processor) as unknown as Worker<EmailSendData>;
  }

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

/**
 * Scheduler Service
 * 스케줄 기반 이메일 발송 관리
 */
import { CronJob } from 'cron';
import { Job } from 'bullmq';
import { createLogger } from '../config/logger';
import { OracleService } from './oracle.service';
import { JobProcessor } from '../processor/job.processor';
import {
  getEmailJobQueue,
  createEmailJobWorker,
  EmailJobData,
} from '../config/queue';

const logger = createLogger('Scheduler');

interface ScheduleConfig {
  schedulerId: number;
  autoId: number;
  type: 'REALTIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  day: number | null;
  hour: number;
  minute: number;
}

export class SchedulerService {
  private cronJob: CronJob | null = null;
  private oracleService: OracleService;
  private jobProcessor: JobProcessor;
  private interval: number;
  private initialized = false;

  constructor() {
    this.interval = parseInt(process.env.SCHEDULER_INTERVAL || '60000', 10);
    this.oracleService = new OracleService();
    this.jobProcessor = new JobProcessor();
  }

  async start(): Promise<void> {
    if (this.initialized) return;

    // Initialize services
    await this.oracleService.initialize();
    await this.jobProcessor.initialize();

    // Create job worker to process email jobs
    createEmailJobWorker(async (job: Job<EmailJobData>) => {
      await this.jobProcessor.processJob(job);
    });

    // Check for pending jobs every minute
    const intervalSeconds = Math.max(30, Math.floor(this.interval / 1000));
    const cronExpression = `*/${intervalSeconds} * * * * *`;

    this.cronJob = new CronJob(
      cronExpression,
      async () => {
        await this.checkAndQueueJobs();
      },
    );

    this.cronJob.start();
    this.initialized = true;
    logger.info(`Scheduler started with interval: ${this.interval}ms (${cronExpression})`);
  }

  async stop(): Promise<void> {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('Scheduler stopped');
    }
    await this.oracleService.close();
    await this.jobProcessor.close();
    this.initialized = false;
  }

  private async checkAndQueueJobs(): Promise<void> {
    try {
      logger.debug('Checking for scheduled jobs...');

      const schedules = await this.oracleService.getPendingSchedules();
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentDayOfWeek = now.getDay(); // 0 = Sunday
      const currentDayOfMonth = now.getDate();

      for (const schedule of schedules) {
        if (this.shouldRun(schedule, currentHour, currentMinute, currentDayOfWeek, currentDayOfMonth)) {
          await this.queueJob(schedule);
        }
      }

    } catch (error) {
      logger.error('Error checking for jobs:', error);
    }
  }

  private shouldRun(
    schedule: ScheduleConfig,
    currentHour: number,
    currentMinute: number,
    currentDayOfWeek: number,
    currentDayOfMonth: number
  ): boolean {
    // Check time match
    if (schedule.hour !== currentHour || schedule.minute !== currentMinute) {
      return false;
    }

    // Check day match based on type
    switch (schedule.type) {
      case 'REALTIME':
        return true; // Always run at scheduled time

      case 'DAILY':
        return true; // Run every day at scheduled time

      case 'WEEKLY':
        // day = 0-6 (Sunday-Saturday)
        return schedule.day === currentDayOfWeek;

      case 'MONTHLY':
        // day = 1-31
        return schedule.day === currentDayOfMonth;

      default:
        return false;
    }
  }

  private async queueJob(schedule: ScheduleConfig): Promise<void> {
    try {
      const queue = getEmailJobQueue();

      // Create run log and get runId
      const runId = await this.oracleService.createRunLog(schedule.autoId, 0);

      const jobData: EmailJobData = {
        autoId: schedule.autoId,
        schedulerId: schedule.schedulerId,
        runId,
        triggeredBy: 'scheduler',
        triggeredAt: new Date().toISOString(),
      };

      // Add to queue with unique job ID to prevent duplicates
      const jobId = `auto-${schedule.autoId}-${new Date().toISOString().slice(0, 16)}`; // Unique per minute

      await queue.add(jobId, jobData, {
        jobId, // Prevent duplicate jobs
        priority: 1,
      });

      logger.info(`Queued job for automation ${schedule.autoId}, schedulerId: ${schedule.schedulerId}, runId: ${runId}`);

    } catch (error: any) {
      // Duplicate job ID means already queued this minute
      if (error.message?.includes('already exists')) {
        logger.debug(`Job for automation ${schedule.autoId} already queued this minute`);
      } else {
        logger.error(`Failed to queue job for automation ${schedule.autoId}:`, error);
      }
    }
  }

  // Manual trigger method
  async triggerJob(autoId: number): Promise<{ runId: number; jobId: string }> {
    const runId = await this.oracleService.createRunLog(autoId, 0);
    const queue = getEmailJobQueue();

    const jobData: EmailJobData = {
      autoId,
      runId,
      triggeredBy: 'manual',
      triggeredAt: new Date().toISOString(),
    };

    const jobId = `manual-${autoId}-${Date.now()}`;

    await queue.add(jobId, jobData, {
      jobId,
      priority: 0, // Higher priority for manual triggers
    });

    logger.info(`Manual trigger queued for automation ${autoId}, runId: ${runId}`);

    return { runId, jobId };
  }

  // API trigger method
  async triggerJobFromApi(autoId: number): Promise<{ runId: number; jobId: string }> {
    if (!this.initialized) {
      await this.start();
    }
    return this.triggerJob(autoId);
  }
}

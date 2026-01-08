import { CronJob } from 'cron';
import { createLogger } from '../config/logger';
import { JobProcessor } from '../processor/job.processor';

const logger = createLogger('Scheduler');

export class SchedulerService {
  private cronJob: CronJob | null = null;
  private jobProcessor: JobProcessor;
  private interval: number;

  constructor() {
    this.interval = parseInt(process.env.SCHEDULER_INTERVAL || '30000', 10);
    this.jobProcessor = new JobProcessor();
  }

  async start() {
    // Check for pending jobs every interval
    this.cronJob = new CronJob(
      `*/${Math.floor(this.interval / 1000)} * * * * *`,
      async () => {
        await this.checkAndProcessJobs();
      },
    );
    this.cronJob.start();
    logger.info(`Scheduler started with interval: ${this.interval}ms`);
  }

  async stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      logger.info('Scheduler stopped');
    }
  }

  private async checkAndProcessJobs() {
    try {
      // TODO: Query AUTOMATION table for active schedules
      // Check if current time matches any schedule
      // If match, create job and send to processor
      logger.debug('Checking for scheduled jobs...');

      // Placeholder for schedule checking logic
      const pendingJobs = await this.getPendingJobs();

      for (const job of pendingJobs) {
        logger.info(`Processing job for automation: ${job.autoId}`);
        await this.jobProcessor.process(job);
      }
    } catch (error) {
      logger.error('Error checking for jobs:', error);
    }
  }

  private async getPendingJobs(): Promise<Array<{ autoId: number; schedulerId: number }>> {
    // TODO: Implement database query
    // SELECT * FROM AUTOMATION WHERE STATUS='ACTIVE' AND schedule matches current time
    return [];
  }
}

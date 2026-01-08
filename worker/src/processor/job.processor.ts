/**
 * Job Processor
 * 이메일 발송 작업 처리기
 */
import { Job } from 'bullmq';
import { createLogger } from '../config/logger';
import { OracleService } from '../services/oracle.service';
import { TemplateService } from '../services/template.service';
import { FileService } from '../services/file.service';
import { SesService } from '../services/ses.service';
import {
  getEmailSendQueue,
  EmailJobData,
  EmailSendData,
  createEmailSendWorker,
} from '../config/queue';

const logger = createLogger('JobProcessor');

interface ProcessResult {
  runId: number;
  autoId: number;
  totalTarget: number;
  successCount: number;
  failCount: number;
  duration: number;
}

export class JobProcessor {
  private oracleService: OracleService;
  private templateService: TemplateService;
  private fileService: FileService;
  private sesService: SesService;
  private devMode: boolean;
  private batchSize: number;
  private initialized = false;

  constructor() {
    this.oracleService = new OracleService();
    this.templateService = new TemplateService();
    this.fileService = new FileService();
    this.sesService = new SesService();
    this.devMode = process.env.DEV_MODE === 'true';
    this.batchSize = parseInt(process.env.BATCH_SIZE || '100', 10);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.oracleService.initialize();

    // Create email send worker
    createEmailSendWorker(async (job: Job<EmailSendData>) => {
      await this.processSingleEmail(job.data);
    });

    this.initialized = true;
    logger.info('Job processor initialized');
  }

  async processJob(job: Job<EmailJobData>): Promise<ProcessResult> {
    const startTime = Date.now();
    const { autoId, runId, triggeredBy } = job.data;

    logger.info(`Starting job for automation: ${autoId}, runId: ${runId}, triggeredBy: ${triggeredBy}`);

    const result: ProcessResult = {
      runId,
      autoId,
      totalTarget: 0,
      successCount: 0,
      failCount: 0,
      duration: 0,
    };

    try {
      // Step 1: Load automation configuration
      const automation = await this.oracleService.loadAutomation(autoId);
      if (!automation) {
        throw new Error(`Automation ${autoId} not found`);
      }

      // Step 2: Execute target query to get recipients
      const targets = await this.oracleService.executeTargetQuery(automation.targetQuery);
      result.totalTarget = targets.length;
      logger.info(`Found ${targets.length} targets for automation ${autoId}`);

      if (targets.length === 0) {
        logger.warn(`No targets found for automation ${autoId}`);
        await this.oracleService.updateRunLog(runId, 'SUCCESS', 0, 0);
        return result;
      }

      // Step 3: Queue each target for processing
      const emailQueue = getEmailSendQueue();

      for (let i = 0; i < targets.length; i++) {
        const target = targets[i];

        try {
          // 3a: Execute mapping query
          const mappingData = await this.oracleService.executeMappingQuery(
            automation.mappingQuery,
            target.primaryKey
          );

          // 3b: Render template
          const html = this.templateService.render(automation.template, {
            ...target,
            ...mappingData,
          });

          // 3c: Render subject
          const subject = this.templateService.renderSubject(automation.subjectTemplate, {
            ...target,
            ...mappingData,
          });

          // 3d: Find attachment file
          let attachmentPath: string | undefined;
          if (target.attachFileName && automation.attachmentPattern) {
            const attachment = await this.fileService.findFile(target.attachFileName);
            if (attachment) {
              attachmentPath = attachment.filePath;
            }
          }

          // 3e: Add to email send queue
          await emailQueue.add(
            `email-${runId}-${i}`,
            {
              runId,
              autoId,
              targetId: target.primaryKey,
              email: target.email,
              subject,
              htmlBody: html,
              senderEmail: automation.senderEmail,
              senderName: automation.senderName,
              attachmentPath,
            },
            {
              priority: 1,
              attempts: 3,
            }
          );

          result.successCount++;

        } catch (targetError: any) {
          result.failCount++;
          logger.error(`Failed to process target ${target.email}:`, targetError);

          // Log the failure
          await this.oracleService.logEmailSend(
            runId,
            target.email,
            'FAILED',
            undefined,
            targetError.message
          );
        }

        // Update progress every batch
        if ((i + 1) % this.batchSize === 0) {
          const progress = Math.round(((i + 1) / targets.length) * 100);
          await job.updateProgress(progress);
          logger.info(`Progress: ${i + 1}/${targets.length} (${progress}%)`);
        }
      }

      // Update final status
      const finalStatus = result.failCount === 0 ? 'SUCCESS' :
                          result.successCount === 0 ? 'FAILED' : 'PARTIAL';

      await this.oracleService.updateRunLog(
        runId,
        finalStatus,
        result.successCount,
        result.failCount
      );

    } catch (error) {
      logger.error(`Job failed for automation ${autoId}:`, error);
      await this.oracleService.updateRunLog(runId, 'FAILED', result.successCount, result.failCount);
      throw error;
    }

    result.duration = Date.now() - startTime;
    logger.info(`Job completed for automation ${autoId}: ${result.successCount}/${result.totalTarget} queued in ${result.duration}ms`);

    return result;
  }

  private async processSingleEmail(data: EmailSendData): Promise<void> {
    const { runId, email, subject, htmlBody, senderEmail, senderName, attachmentPath } = data;

    try {
      // Load attachment if exists
      let attachment = null;
      if (attachmentPath) {
        attachment = await this.fileService.loadFile(attachmentPath);
      }

      // Send email
      const result = await this.sesService.send({
        to: email,
        subject,
        htmlBody,
        senderEmail,
        senderName,
        attachment,
      });

      // Log result
      await this.oracleService.logEmailSend(
        runId,
        email,
        result.success ? 'SUCCESS' : 'FAILED',
        result.messageId,
        result.error
      );

    } catch (error: any) {
      logger.error(`Failed to send email to ${email}:`, error);

      await this.oracleService.logEmailSend(
        runId,
        email,
        'FAILED',
        undefined,
        error.message
      );

      throw error;
    }
  }

  // Legacy method for direct processing (without queue)
  async process(job: { autoId: number; schedulerId: number }): Promise<ProcessResult> {
    await this.initialize();

    const runId = await this.oracleService.createRunLog(job.autoId, 0);

    const jobData: EmailJobData = {
      autoId: job.autoId,
      schedulerId: job.schedulerId,
      runId,
      triggeredBy: 'scheduler',
      triggeredAt: new Date().toISOString(),
    };

    // Create a minimal mock job object for legacy processing
    const mockJob = {
      data: jobData,
      updateProgress: async (_progress: number) => { /* noop */ },
    } as unknown as Job<EmailJobData>;

    return this.processJob(mockJob);
  }

  async close(): Promise<void> {
    await this.oracleService.close();
    logger.info('Job processor closed');
  }
}

import { createLogger } from '../config/logger';
import { OracleService } from '../services/oracle.service';
import { TemplateService } from '../services/template.service';
import { FileService } from '../services/file.service';
import { SesService } from '../services/ses.service';

const logger = createLogger('JobProcessor');

interface JobData {
  autoId: number;
  schedulerId: number;
}

interface ProcessResult {
  runId: number;
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

  constructor() {
    this.oracleService = new OracleService();
    this.templateService = new TemplateService();
    this.fileService = new FileService();
    this.sesService = new SesService();
    this.devMode = process.env.DEV_MODE === 'true';
    this.batchSize = parseInt(process.env.BATCH_SIZE || '100', 10);
  }

  async process(job: JobData): Promise<ProcessResult> {
    const startTime = Date.now();
    const { autoId } = job;

    logger.info(`Starting job processing for automation: ${autoId}`);

    const result: ProcessResult = {
      runId: Date.now(), // TODO: Generate from database
      totalTarget: 0,
      successCount: 0,
      failCount: 0,
      duration: 0,
    };

    try {
      // Step 1: Load automation configuration
      const automation = await this.loadAutomation(autoId);
      if (!automation) {
        throw new Error(`Automation ${autoId} not found`);
      }

      // Step 2: Execute target query to get recipients
      const targets = await this.oracleService.executeTargetQuery(automation.targetQuery);
      result.totalTarget = targets.length;
      logger.info(`Found ${targets.length} targets for automation ${autoId}`);

      // Step 3: Process each target
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
          let attachment = null;
          if (target.attachFileName) {
            attachment = await this.fileService.findFile(target.attachFileName);
          }

          // 3e: Send email
          if (this.devMode) {
            logger.debug(`[DEV MODE] Would send to: ${target.email}`);
          } else {
            await this.sesService.send({
              to: target.email,
              subject,
              htmlBody: html,
              senderEmail: automation.senderEmail,
              senderName: automation.senderName,
              attachment,
            });
          }

          // 3f: Execute update query
          if (automation.updateQuery) {
            await this.oracleService.executeUpdateQuery(
              automation.updateQuery,
              target.primaryKey
            );
          }

          result.successCount++;
          logger.debug(`Successfully processed target ${i + 1}/${targets.length}`);

        } catch (targetError: any) {
          result.failCount++;
          logger.error(`Failed to process target ${target.email}:`, targetError);
          // Continue with next target
        }

        // Rate limiting for SES
        if ((i + 1) % this.batchSize === 0) {
          await this.delay(1000); // 1 second pause between batches
        }
      }

    } catch (error) {
      logger.error(`Job failed for automation ${autoId}:`, error);
      throw error;
    }

    result.duration = Date.now() - startTime;
    logger.info(`Job completed for automation ${autoId}: ${result.successCount}/${result.totalTarget} success in ${result.duration}ms`);

    return result;
  }

  private async loadAutomation(autoId: number): Promise<any> {
    // TODO: Load from database
    // This should load AUTOMATION, DBIO_TARGET, DBIO_MAPPING, DBIO_UPDATE, TEMPLATE, EMAIL_SETTING
    return null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

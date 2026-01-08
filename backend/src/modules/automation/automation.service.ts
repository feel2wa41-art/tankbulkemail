/**
 * Automation Service
 * 자동화 설정 비즈니스 로직
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { AutomationRepository } from './repositories/automation.repository';
import { DatabaseService } from '../../config/database.service';

@Injectable()
export class AutomationService {
  constructor(
    private readonly automationRepository: AutomationRepository,
    private readonly databaseService: DatabaseService,
  ) {}

  async findByOrg(orgId?: number) {
    if (!this.databaseService.isConnected()) {
      return this.getDevAutomations();
    }

    try {
      const automations = await this.automationRepository.findAll(orgId);
      return {
        success: true,
        data: automations.map(auto => this.mapAutomation(auto)),
      };
    } catch (error) {
      if (this.isDbConnectionError(error)) {
        return this.getDevAutomations();
      }
      throw error;
    }
  }

  async findOne(id: number) {
    if (!this.databaseService.isConnected()) {
      return this.getDevAutomationById(id);
    }

    try {
      const automation = await this.automationRepository.findById(id);
      if (!automation) {
        throw new NotFoundException(`Automation with ID ${id} not found`);
      }

      // 관련 설정 조회
      const [target, mappings, updateQuery, template, emailSetting] = await Promise.all([
        this.automationRepository.findTargetByAutoId(id),
        this.automationRepository.findMappingsByAutoId(id),
        this.automationRepository.findUpdateByAutoId(id),
        this.automationRepository.findTemplateByAutoId(id),
        this.automationRepository.findEmailSettingByAutoId(id),
      ]);

      return {
        success: true,
        data: {
          ...this.mapAutomation(automation),
          dbio: {
            target: target ? { queryText: target.QUERY_TEXT, appendMode: target.APPEND_MODE } : null,
            mappings: mappings.map(m => ({ queryText: m.QUERY_TEXT, mapType: m.MAP_TYPE })),
            updateQuery: updateQuery ? { queryText: updateQuery.QUERY_TEXT } : null,
          },
          template: template ? {
            htmlContent: template.HTML_CONTENT,
            validYn: template.VALID_YN,
          } : null,
          emailSetting: emailSetting ? {
            senderEmail: emailSetting.SENDER_EMAIL,
            senderName: emailSetting.SENDER_NAME,
            returnEmail: emailSetting.RETURN_EMAIL,
            subjectTemplate: emailSetting.SUBJECT_TEMPLATE,
            language: emailSetting.LANGUAGE,
          } : null,
        },
      };
    } catch (error) {
      if (this.isDbConnectionError(error)) {
        return this.getDevAutomationById(id);
      }
      throw error;
    }
  }

  async create(dto: any) {
    if (!this.databaseService.isConnected()) {
      return {
        success: true,
        message: 'Automation created (dev mode)',
        data: { autoId: Date.now(), ...dto },
      };
    }

    try {
      const autoId = await this.automationRepository.create({
        orgId: dto.orgId,
        autoName: dto.autoName,
        status: dto.status || 'INACTIVE',
      });

      return {
        success: true,
        message: 'Automation created successfully',
        data: { autoId },
      };
    } catch (error) {
      if (this.isDbConnectionError(error)) {
        return {
          success: true,
          message: 'Automation created (dev mode)',
          data: { autoId: Date.now(), ...dto },
        };
      }
      throw error;
    }
  }

  async update(id: number, dto: any) {
    if (!this.databaseService.isConnected()) {
      return { success: true, message: 'Automation updated (dev mode)' };
    }

    try {
      const automation = await this.automationRepository.findById(id);
      if (!automation) {
        throw new NotFoundException(`Automation with ID ${id} not found`);
      }

      await this.automationRepository.update(id, {
        autoName: dto.autoName,
        status: dto.status,
      });

      return {
        success: true,
        message: 'Automation updated successfully',
      };
    } catch (error) {
      if (this.isDbConnectionError(error)) {
        return { success: true, message: 'Automation updated (dev mode)' };
      }
      throw error;
    }
  }

  async remove(id: number) {
    if (!this.databaseService.isConnected()) {
      return { success: true, message: 'Automation deleted (dev mode)' };
    }

    try {
      const automation = await this.automationRepository.findById(id);
      if (!automation) {
        throw new NotFoundException(`Automation with ID ${id} not found`);
      }

      await this.automationRepository.delete(id);

      return {
        success: true,
        message: 'Automation deleted successfully',
      };
    } catch (error) {
      if (this.isDbConnectionError(error)) {
        return { success: true, message: 'Automation deleted (dev mode)' };
      }
      throw error;
    }
  }

  async triggerRun(id: number) {
    // TODO: BullMQ 작업 큐에 발송 작업 추가
    return {
      success: true,
      message: 'Automation run triggered',
      data: { jobId: `job-${id}-${Date.now()}` },
    };
  }

  async registerTarget(id: number, dto: any) {
    if (!this.databaseService.isConnected()) {
      return { success: true, message: 'Target query registered (dev mode)' };
    }

    try {
      await this.automationRepository.upsertTarget(id, dto.queryText, dto.appendMode || 'N');
      return {
        success: true,
        message: 'Target query registered successfully',
      };
    } catch (error) {
      if (this.isDbConnectionError(error)) {
        return { success: true, message: 'Target query registered (dev mode)' };
      }
      throw error;
    }
  }

  async registerMapping(id: number, dto: any) {
    if (!this.databaseService.isConnected()) {
      return { success: true, message: 'Mapping query registered (dev mode)' };
    }

    try {
      await this.automationRepository.upsertMapping(id, dto.queryText, dto.mapType || 'SIMPLE');
      return {
        success: true,
        message: 'Mapping query registered successfully',
      };
    } catch (error) {
      if (this.isDbConnectionError(error)) {
        return { success: true, message: 'Mapping query registered (dev mode)' };
      }
      throw error;
    }
  }

  async registerUpdate(id: number, dto: any) {
    if (!this.databaseService.isConnected()) {
      return { success: true, message: 'Update query registered (dev mode)' };
    }

    try {
      await this.automationRepository.upsertUpdate(id, dto.queryText);
      return {
        success: true,
        message: 'Update query registered successfully',
      };
    } catch (error) {
      if (this.isDbConnectionError(error)) {
        return { success: true, message: 'Update query registered (dev mode)' };
      }
      throw error;
    }
  }

  async getTemplate(id: number) {
    if (!this.databaseService.isConnected()) {
      return {
        success: true,
        message: 'Development mode',
        data: { htmlContent: '<p>Sample template for $(CUSTOMER_NAME)</p>', validYn: 'Y' },
      };
    }

    try {
      const template = await this.automationRepository.findTemplateByAutoId(id);
      return {
        success: true,
        data: template ? {
          htmlContent: template.HTML_CONTENT,
          validYn: template.VALID_YN,
          updatedAt: template.UPDATED_AT,
        } : null,
      };
    } catch (error) {
      if (this.isDbConnectionError(error)) {
        return {
          success: true,
          message: 'Development mode',
          data: { htmlContent: '<p>Sample template</p>', validYn: 'Y' },
        };
      }
      throw error;
    }
  }

  async saveTemplate(id: number, dto: any, userId: number = 1) {
    if (!this.databaseService.isConnected()) {
      return { success: true, message: 'Template saved (dev mode)' };
    }

    try {
      await this.automationRepository.upsertTemplate(id, dto.htmlContent, userId);
      return {
        success: true,
        message: 'Template saved successfully',
      };
    } catch (error) {
      if (this.isDbConnectionError(error)) {
        return { success: true, message: 'Template saved (dev mode)' };
      }
      throw error;
    }
  }

  async previewTemplate(id: number) {
    // 실제 데이터로 템플릿 미리보기 생성
    const template = await this.getTemplate(id);
    const emailSetting = await this.automationRepository.findEmailSettingByAutoId(id);

    // 샘플 데이터로 변수 치환
    let html = template.data?.htmlContent || '';
    html = html.replace(/\$\(([^)]+)\)/g, (match, varName) => {
      const sampleData: Record<string, string> = {
        CUSTOMER_NAME: '홍길동',
        EMAIL: 'sample@example.com',
        COMPANY: 'Sample Corp',
        DATE: new Date().toLocaleDateString('ko-KR'),
      };
      return sampleData[varName] || match;
    });

    return {
      success: true,
      data: {
        html,
        subject: emailSetting?.SUBJECT_TEMPLATE || 'Sample Subject',
      },
    };
  }

  async saveEmailSetting(id: number, dto: any) {
    if (!this.databaseService.isConnected()) {
      return { success: true, message: 'Email settings saved (dev mode)' };
    }

    try {
      await this.automationRepository.upsertEmailSetting(
        id,
        dto.senderEmail,
        dto.senderName,
        dto.returnEmail,
        dto.subjectTemplate,
        dto.language || 'UTF-8'
      );
      return {
        success: true,
        message: 'Email settings saved successfully',
      };
    } catch (error) {
      if (this.isDbConnectionError(error)) {
        return { success: true, message: 'Email settings saved (dev mode)' };
      }
      throw error;
    }
  }

  private mapAutomation(auto: any) {
    return {
      autoId: auto.AUTO_ID,
      orgId: auto.ORG_ID,
      autoName: auto.AUTO_NAME,
      status: auto.STATUS,
      lastRunAt: auto.LAST_RUN_AT,
      nextRunAt: auto.NEXT_RUN_AT,
      createdAt: auto.CREATED_AT,
      updatedAt: auto.UPDATED_AT,
    };
  }

  private isDbConnectionError(error: any): boolean {
    return error.message?.includes('NJS-') ||
           error.message?.includes('ORA-') ||
           error.message?.includes('connection');
  }

  private getDevAutomations() {
    return {
      success: true,
      message: 'Development mode - no database connection',
      data: [
        {
          autoId: 1,
          orgId: 1,
          autoName: 'Sample Automation',
          status: 'ACTIVE',
          lastRunAt: new Date(Date.now() - 86400000),
          nextRunAt: new Date(Date.now() + 3600000),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
  }

  private getDevAutomationById(id: number) {
    return {
      success: true,
      message: 'Development mode - no database connection',
      data: {
        autoId: id,
        orgId: 1,
        autoName: 'Sample Automation',
        status: 'ACTIVE',
        lastRunAt: new Date(Date.now() - 86400000),
        nextRunAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
        dbio: {
          target: { queryText: 'SELECT * FROM CUSTOMERS WHERE STATUS = :1', appendMode: 'N' },
          mappings: [{ queryText: 'SELECT * FROM CUSTOMER_DETAILS WHERE CUST_ID = :1', mapType: 'SIMPLE' }],
          updateQuery: { queryText: 'UPDATE CUSTOMERS SET SENT_YN = :1 WHERE CUST_ID = :2' },
        },
        template: { htmlContent: '<p>Hello $(CUSTOMER_NAME)</p>', validYn: 'Y' },
        emailSetting: {
          senderEmail: 'noreply@example.com',
          senderName: 'Tank System',
          returnEmail: 'bounce@example.com',
          subjectTemplate: 'Hello $(CUSTOMER_NAME)',
          language: 'UTF-8',
        },
      },
    };
  }
}

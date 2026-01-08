// Automation Types

export type AutomationStatus = 'ACTIVE' | 'PAUSED' | 'INACTIVE';

export interface Automation {
  autoId: number;
  orgId: number;
  autoName: string;
  status: AutomationStatus;
  lastRunAt?: Date;
  nextRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAutomationDto {
  orgId: number;
  autoName: string;
  status?: AutomationStatus;
}

export interface UpdateAutomationDto {
  autoName?: string;
  status?: AutomationStatus;
}

export interface AutomationDetail extends Automation {
  dbioTarget?: DbioTarget;
  dbioMapping?: DbioMapping[];
  dbioUpdate?: DbioUpdate;
  template?: Template;
  emailSetting?: EmailSetting;
  scheduler?: Scheduler;
}

// Forward declarations
interface DbioTarget {
  targetId: number;
  autoId: number;
  queryText: string;
  appendMode: 'Y' | 'N';
}

interface DbioMapping {
  mapId: number;
  autoId: number;
  queryText: string;
  mapType: 'SIMPLE' | 'LIST' | 'TEXT';
}

interface DbioUpdate {
  updateId: number;
  autoId: number;
  queryText: string;
}

interface Template {
  templateId: number;
  autoId: number;
  htmlContent: string;
  validYn: 'Y' | 'N';
}

interface EmailSetting {
  settingId: number;
  autoId: number;
  senderEmail: string;
  senderName: string;
  returnEmail?: string;
  subjectTemplate: string;
  language: string;
}

interface Scheduler {
  schedulerId: number;
  autoId: number;
  type: 'REALTIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  day?: number;
  hour: number;
  minute: number;
  status: 'ACTIVE' | 'PAUSED';
}

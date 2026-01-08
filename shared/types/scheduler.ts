// Scheduler Types

export type ScheduleType = 'REALTIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type SchedulerStatus = 'ACTIVE' | 'PAUSED';

export interface Scheduler {
  schedulerId: number;
  autoId: number;
  type: ScheduleType;
  day?: number;        // 월/주 기준 날짜
  hour: number;
  minute: number;
  status: SchedulerStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSchedulerDto {
  automationId: number;
  type: ScheduleType;
  day?: number;
  hour: number;
  minute: number;
}

export interface UpdateSchedulerDto {
  type?: ScheduleType;
  day?: number;
  hour?: number;
  minute?: number;
  status?: SchedulerStatus;
}

// Job Queue Types
export type JobStatus = 'WAITING' | 'RUNNING' | 'DONE' | 'FAIL';

export interface Job {
  jobId: number;
  autoId: number;
  schedulerId?: number;
  status: JobStatus;
  startAt?: Date;
  endAt?: Date;
  totalTarget: number;
  processedCount: number;
  successCount: number;
  failCount: number;
  message?: string;
  createdAt: Date;
}

export interface JobProgress {
  jobId: number;
  status: JobStatus;
  totalTarget: number;
  processedCount: number;
  successCount: number;
  failCount: number;
  percentage: number;
  estimatedRemainingTime?: number;
}

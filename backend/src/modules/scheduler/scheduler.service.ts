/**
 * Scheduler Service
 * 스케줄러 관리 비즈니스 로직
 */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SchedulerRepository } from './repositories/scheduler.repository';
import { DatabaseService } from '../../config/database.service';

@Injectable()
export class SchedulerService {
  constructor(
    private readonly schedulerRepository: SchedulerRepository,
    private readonly databaseService: DatabaseService,
  ) {}

  async findAll(status?: string) {
    if (!this.databaseService.isConnected()) {
      return this.getDevSchedulers();
    }

    try {
      const schedulers = await this.schedulerRepository.findAll(status);
      return {
        success: true,
        data: schedulers.map(sched => this.mapScheduler(sched)),
      };
    } catch (error) {
      if (this.isDbConnectionError(error)) {
        return this.getDevSchedulers();
      }
      throw error;
    }
  }

  async findByAutoId(autoId: number) {
    if (!this.databaseService.isConnected()) {
      return {
        success: true,
        message: 'Development mode',
        data: null,
      };
    }

    try {
      const scheduler = await this.schedulerRepository.findByAutoId(autoId);
      return {
        success: true,
        data: scheduler ? this.mapScheduler(scheduler) : null,
      };
    } catch (error) {
      if (this.isDbConnectionError(error)) {
        return { success: true, message: 'Development mode', data: null };
      }
      throw error;
    }
  }

  async create(dto: any) {
    if (!this.databaseService.isConnected()) {
      return {
        success: true,
        message: 'Schedule created (dev mode)',
        data: { schedulerId: Date.now(), ...dto },
      };
    }

    try {
      // 유효성 검사
      this.validateScheduleDto(dto);

      // 기존 스케줄 확인 (Automation당 하나의 스케줄만 허용)
      const existing = await this.schedulerRepository.findByAutoId(dto.autoId);
      if (existing) {
        throw new BadRequestException('Automation already has a schedule. Delete existing schedule first.');
      }

      const schedulerId = await this.schedulerRepository.create({
        autoId: dto.autoId,
        type: dto.type,
        day: dto.day,
        hour: dto.hour,
        minute: dto.minute,
      });

      return {
        success: true,
        message: 'Schedule created successfully',
        data: { schedulerId },
      };
    } catch (error) {
      if (this.isDbConnectionError(error)) {
        return {
          success: true,
          message: 'Schedule created (dev mode)',
          data: { schedulerId: Date.now(), ...dto },
        };
      }
      throw error;
    }
  }

  async update(id: number, dto: any) {
    if (!this.databaseService.isConnected()) {
      return { success: true, message: 'Schedule updated (dev mode)' };
    }

    try {
      const scheduler = await this.schedulerRepository.findById(id);
      if (!scheduler) {
        throw new NotFoundException(`Scheduler with ID ${id} not found`);
      }

      await this.schedulerRepository.update(id, {
        type: dto.type,
        day: dto.day,
        hour: dto.hour,
        minute: dto.minute,
        status: dto.status,
      });

      return {
        success: true,
        message: 'Schedule updated successfully',
      };
    } catch (error) {
      if (this.isDbConnectionError(error)) {
        return { success: true, message: 'Schedule updated (dev mode)' };
      }
      throw error;
    }
  }

  async remove(id: number) {
    if (!this.databaseService.isConnected()) {
      return { success: true, message: 'Schedule deleted (dev mode)' };
    }

    try {
      const scheduler = await this.schedulerRepository.findById(id);
      if (!scheduler) {
        throw new NotFoundException(`Scheduler with ID ${id} not found`);
      }

      await this.schedulerRepository.delete(id);

      return {
        success: true,
        message: 'Schedule deleted successfully',
      };
    } catch (error) {
      if (this.isDbConnectionError(error)) {
        return { success: true, message: 'Schedule deleted (dev mode)' };
      }
      throw error;
    }
  }

  async getActiveSchedulers() {
    if (!this.databaseService.isConnected()) {
      return [];
    }

    try {
      return await this.schedulerRepository.findActiveSchedulers();
    } catch (error) {
      if (this.isDbConnectionError(error)) {
        return [];
      }
      throw error;
    }
  }

  async updateStatus(id: number, status: string) {
    if (!this.databaseService.isConnected()) {
      return { success: true, message: 'Status updated (dev mode)' };
    }

    try {
      await this.schedulerRepository.updateStatus(id, status);
      return {
        success: true,
        message: 'Status updated successfully',
      };
    } catch (error) {
      if (this.isDbConnectionError(error)) {
        return { success: true, message: 'Status updated (dev mode)' };
      }
      throw error;
    }
  }

  private validateScheduleDto(dto: any) {
    const validTypes = ['REALTIME', 'DAILY', 'WEEKLY', 'MONTHLY'];
    if (!validTypes.includes(dto.type)) {
      throw new BadRequestException(`Invalid schedule type. Must be one of: ${validTypes.join(', ')}`);
    }

    if (dto.hour < 0 || dto.hour > 23) {
      throw new BadRequestException('Hour must be between 0 and 23');
    }

    if (dto.minute < 0 || dto.minute > 59) {
      throw new BadRequestException('Minute must be between 0 and 59');
    }

    if (dto.type === 'WEEKLY' && (dto.day < 0 || dto.day > 6)) {
      throw new BadRequestException('For weekly schedule, day must be between 0 (Sunday) and 6 (Saturday)');
    }

    if (dto.type === 'MONTHLY' && (dto.day < 1 || dto.day > 31)) {
      throw new BadRequestException('For monthly schedule, day must be between 1 and 31');
    }
  }

  private mapScheduler(sched: any) {
    return {
      schedulerId: sched.SCHEDULER_ID,
      autoId: sched.AUTO_ID,
      type: sched.TYPE,
      day: sched.DAY,
      hour: sched.HOUR,
      minute: sched.MINUTE,
      status: sched.STATUS,
      createdAt: sched.CREATED_AT,
      updatedAt: sched.UPDATED_AT,
    };
  }

  private isDbConnectionError(error: any): boolean {
    return error.message?.includes('NJS-') ||
           error.message?.includes('ORA-') ||
           error.message?.includes('connection');
  }

  private getDevSchedulers() {
    return {
      success: true,
      message: 'Development mode - no database connection',
      data: [
        {
          schedulerId: 1,
          autoId: 1,
          type: 'DAILY',
          day: null,
          hour: 9,
          minute: 0,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
  }
}

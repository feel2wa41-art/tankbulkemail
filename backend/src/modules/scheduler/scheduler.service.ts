import { Injectable } from '@nestjs/common';

@Injectable()
export class SchedulerService {
  async findAll() {
    // TODO: Implement
    return { success: true, data: [] };
  }

  async create(dto: any) {
    // TODO: Implement
    return { success: true, message: 'Schedule created' };
  }

  async remove(id: number) {
    // TODO: Implement
    return { success: true, message: 'Schedule deleted' };
  }
}

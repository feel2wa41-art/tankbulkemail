/**
 * Organization Service
 * 조직 관리 비즈니스 로직
 */
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateOrgDto, UpdateOrgDto } from './dto/org.dto';
import { OrgRepository } from './repositories/org.repository';
import { DatabaseService } from '../../config/database.service';

@Injectable()
export class OrgService {
  constructor(
    private readonly orgRepository: OrgRepository,
    private readonly databaseService: DatabaseService,
  ) {}

  async findAll() {
    // 개발 모드 (DB 연결 없음)
    if (!this.databaseService.isConnected()) {
      return this.getDevData();
    }

    try {
      const organizations = await this.orgRepository.findAll();
      return {
        success: true,
        data: organizations.map(org => ({
          orgId: org.ORG_ID,
          orgName: org.ORG_NAME,
          description: org.DESCRIPTION,
          useYn: org.USE_YN,
          createdAt: org.CREATED_AT,
          updatedAt: org.UPDATED_AT,
        })),
      };
    } catch (error) {
      if (this.isDbConnectionError(error)) {
        return this.getDevData();
      }
      throw error;
    }
  }

  async findOne(id: number) {
    if (!this.databaseService.isConnected()) {
      return this.getDevDataById(id);
    }

    try {
      const org = await this.orgRepository.findById(id);

      if (!org) {
        throw new NotFoundException(`Organization with ID ${id} not found`);
      }

      return {
        success: true,
        data: {
          orgId: org.ORG_ID,
          orgName: org.ORG_NAME,
          description: org.DESCRIPTION,
          useYn: org.USE_YN,
          createdAt: org.CREATED_AT,
          updatedAt: org.UPDATED_AT,
        },
      };
    } catch (error) {
      if (this.isDbConnectionError(error)) {
        return this.getDevDataById(id);
      }
      throw error;
    }
  }

  async create(createOrgDto: CreateOrgDto) {
    if (!this.databaseService.isConnected()) {
      return {
        success: true,
        message: 'Organization created (dev mode)',
        data: { ...createOrgDto, orgId: Date.now() },
      };
    }

    try {
      // 중복 이름 체크
      const existing = await this.orgRepository.findByName(createOrgDto.orgName);
      if (existing) {
        throw new ConflictException(`Organization with name '${createOrgDto.orgName}' already exists`);
      }

      const orgId = await this.orgRepository.create({
        orgName: createOrgDto.orgName,
        description: createOrgDto.description,
      });

      return {
        success: true,
        message: 'Organization created successfully',
        data: { orgId, ...createOrgDto },
      };
    } catch (error) {
      if (this.isDbConnectionError(error)) {
        return {
          success: true,
          message: 'Organization created (dev mode - no DB connection)',
          data: { ...createOrgDto, orgId: Date.now() },
        };
      }
      throw error;
    }
  }

  async update(id: number, updateOrgDto: UpdateOrgDto) {
    if (!this.databaseService.isConnected()) {
      return {
        success: true,
        message: 'Organization updated (dev mode)',
      };
    }

    try {
      const org = await this.orgRepository.findById(id);
      if (!org) {
        throw new NotFoundException(`Organization with ID ${id} not found`);
      }

      // 이름 변경 시 중복 체크
      if (updateOrgDto.orgName && updateOrgDto.orgName !== org.ORG_NAME) {
        const existing = await this.orgRepository.findByName(updateOrgDto.orgName);
        if (existing) {
          throw new ConflictException(`Organization with name '${updateOrgDto.orgName}' already exists`);
        }
      }

      await this.orgRepository.update(id, {
        orgName: updateOrgDto.orgName,
        description: updateOrgDto.description,
        useYn: updateOrgDto.useYn,
      });

      return {
        success: true,
        message: 'Organization updated successfully',
      };
    } catch (error) {
      if (this.isDbConnectionError(error)) {
        return {
          success: true,
          message: 'Organization updated (dev mode - no DB connection)',
        };
      }
      throw error;
    }
  }

  async remove(id: number) {
    if (!this.databaseService.isConnected()) {
      return {
        success: true,
        message: 'Organization deleted (dev mode)',
      };
    }

    try {
      const org = await this.orgRepository.findById(id);
      if (!org) {
        throw new NotFoundException(`Organization with ID ${id} not found`);
      }

      await this.orgRepository.delete(id);

      return {
        success: true,
        message: 'Organization deleted successfully',
      };
    } catch (error) {
      if (this.isDbConnectionError(error)) {
        return {
          success: true,
          message: 'Organization deleted (dev mode - no DB connection)',
        };
      }
      throw error;
    }
  }

  private isDbConnectionError(error: any): boolean {
    const errorMessage = error?.message || String(error) || '';
    return errorMessage.includes('NJS-') ||
           errorMessage.includes('ORA-') ||
           errorMessage.includes('connection') ||
           errorMessage.includes('ECONNREFUSED');
  }

  private getDevData() {
    return {
      success: true,
      message: 'Development mode - no database connection',
      data: [
        {
          orgId: 1,
          orgName: 'Sample Organization',
          description: 'Sample organization for development',
          useYn: 'Y',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
  }

  private getDevDataById(id: number) {
    return {
      success: true,
      message: 'Development mode - no database connection',
      data: {
        orgId: id,
        orgName: 'Sample Organization',
        description: 'Sample organization for development',
        useYn: 'Y',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  }
}

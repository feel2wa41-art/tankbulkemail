/**
 * DB Profile Service
 * 데이터베이스 연결 프로필 관리 서비스
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { DbProfileRepository, DbProfileEntity } from './repositories/dbprofile.repository';
import { CreateDbProfileDto, UpdateDbProfileDto, TestConnectionDto, DbType } from './dto';
import * as oracledb from 'oracledb';

export interface DbProfileResponse {
  profileId: number;
  profileName: string;
  description: string | null;
  dbType: string;
  host: string;
  port: number;
  database: string;
  username: string;
  options: string | null;
  useYn: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class DbProfileService {
  constructor(private readonly dbProfileRepository: DbProfileRepository) {}

  async findAll(): Promise<{ success: boolean; data: DbProfileResponse[] }> {
    const profiles = await this.dbProfileRepository.findAll();
    return {
      success: true,
      data: profiles.map(this.toResponse),
    };
  }

  async findById(profileId: number): Promise<{ success: boolean; data: DbProfileResponse }> {
    const profile = await this.dbProfileRepository.findById(profileId);
    if (!profile) {
      throw new NotFoundException('DB Profile not found');
    }
    return {
      success: true,
      data: this.toResponse(profile),
    };
  }

  async create(dto: CreateDbProfileDto): Promise<{ success: boolean; message: string; data: DbProfileResponse }> {
    const profileId = await this.dbProfileRepository.create({
      profileName: dto.profileName,
      description: dto.description,
      dbType: dto.dbType,
      host: dto.host,
      port: dto.port,
      database: dto.database,
      username: dto.username,
      password: dto.password,
      options: dto.options,
    });

    const result = await this.findById(profileId);
    return {
      success: true,
      message: 'DB Profile created successfully',
      data: result.data,
    };
  }

  async update(
    profileId: number,
    dto: UpdateDbProfileDto,
  ): Promise<{ success: boolean; message: string; data: DbProfileResponse }> {
    const existing = await this.dbProfileRepository.findById(profileId);
    if (!existing) {
      throw new NotFoundException('DB Profile not found');
    }

    await this.dbProfileRepository.update(profileId, {
      profileName: dto.profileName,
      description: dto.description,
      dbType: dto.dbType,
      host: dto.host,
      port: dto.port,
      database: dto.database,
      username: dto.username,
      password: dto.password,
      options: dto.options,
    });

    const result = await this.findById(profileId);
    return {
      success: true,
      message: 'DB Profile updated successfully',
      data: result.data,
    };
  }

  async delete(profileId: number): Promise<{ success: boolean; message: string }> {
    const existing = await this.dbProfileRepository.findById(profileId);
    if (!existing) {
      throw new NotFoundException('DB Profile not found');
    }

    await this.dbProfileRepository.delete(profileId);
    return {
      success: true,
      message: 'DB Profile deleted successfully',
    };
  }

  async testConnection(dto: TestConnectionDto): Promise<{
    success: boolean;
    message: string;
    details?: { version?: string; time?: number };
  }> {
    const startTime = Date.now();

    try {
      if (dto.dbType === DbType.ORACLE) {
        return await this.testOracleConnection(dto, startTime);
      }

      // For other DB types, return mock success in dev mode
      if (process.env.DEV_MODE === 'true') {
        return {
          success: true,
          message: 'Connection test successful (DEV MODE)',
          details: { time: Date.now() - startTime },
        };
      }

      return {
        success: false,
        message: `Database type ${dto.dbType} is not yet supported`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        details: { time: Date.now() - startTime },
      };
    }
  }

  private async testOracleConnection(
    dto: TestConnectionDto,
    startTime: number,
  ): Promise<{ success: boolean; message: string; details?: { version?: string; time?: number } }> {
    if (process.env.DEV_MODE === 'true') {
      return {
        success: true,
        message: 'Oracle connection test successful (DEV MODE)',
        details: { version: 'Oracle 19c (Mock)', time: Date.now() - startTime },
      };
    }

    let connection: oracledb.Connection | null = null;

    try {
      const connectString = `${dto.host}:${dto.port}/${dto.database}`;

      connection = await oracledb.getConnection({
        user: dto.username,
        password: dto.password,
        connectString,
      });

      // Get Oracle version
      const result = await connection.execute('SELECT BANNER FROM V$VERSION WHERE ROWNUM = 1');
      const rows = result.rows as any[];
      const version = (rows?.[0]?.[0] as string) || 'Unknown';

      return {
        success: true,
        message: 'Oracle connection test successful',
        details: {
          version,
          time: Date.now() - startTime,
        },
      };
    } catch (error: any) {
      throw error;
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch {
          // Ignore close errors
        }
      }
    }
  }

  private toResponse(entity: DbProfileEntity): DbProfileResponse {
    return {
      profileId: entity.PROFILE_ID,
      profileName: entity.PROFILE_NAME,
      description: entity.DESCRIPTION,
      dbType: entity.DB_TYPE,
      host: entity.HOST,
      port: entity.PORT,
      database: entity.DATABASE_NAME,
      username: entity.USERNAME,
      options: entity.OPTIONS,
      useYn: entity.USE_YN,
      createdAt: entity.CREATED_AT,
      updatedAt: entity.UPDATED_AT,
    };
  }
}

/**
 * DB Profile DTOs
 */
import { IsString, IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DbType {
  ORACLE = 'ORACLE',
  MYSQL = 'MYSQL',
  POSTGRESQL = 'POSTGRESQL',
  MSSQL = 'MSSQL',
}

export class CreateDbProfileDto {
  @ApiProperty({ description: 'Profile name' })
  @IsString()
  profileName: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: DbType, description: 'Database type' })
  @IsEnum(DbType)
  dbType: DbType;

  @ApiProperty({ description: 'Database host' })
  @IsString()
  host: string;

  @ApiProperty({ description: 'Database port' })
  @IsNumber()
  @Min(1)
  @Max(65535)
  port: number;

  @ApiProperty({ description: 'Database name/service' })
  @IsString()
  database: string;

  @ApiProperty({ description: 'Database username' })
  @IsString()
  username: string;

  @ApiProperty({ description: 'Database password' })
  @IsString()
  password: string;

  @ApiPropertyOptional({ description: 'Additional options (JSON)' })
  @IsOptional()
  @IsString()
  options?: string;
}

export class UpdateDbProfileDto {
  @ApiPropertyOptional({ description: 'Profile name' })
  @IsOptional()
  @IsString()
  profileName?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: DbType, description: 'Database type' })
  @IsOptional()
  @IsEnum(DbType)
  dbType?: DbType;

  @ApiPropertyOptional({ description: 'Database host' })
  @IsOptional()
  @IsString()
  host?: string;

  @ApiPropertyOptional({ description: 'Database port' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiPropertyOptional({ description: 'Database name/service' })
  @IsOptional()
  @IsString()
  database?: string;

  @ApiPropertyOptional({ description: 'Database username' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ description: 'Database password' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: 'Additional options (JSON)' })
  @IsOptional()
  @IsString()
  options?: string;
}

export class TestConnectionDto {
  @ApiProperty({ enum: DbType, description: 'Database type' })
  @IsEnum(DbType)
  dbType: DbType;

  @ApiProperty({ description: 'Database host' })
  @IsString()
  host: string;

  @ApiProperty({ description: 'Database port' })
  @IsNumber()
  @Min(1)
  @Max(65535)
  port: number;

  @ApiProperty({ description: 'Database name/service' })
  @IsString()
  database: string;

  @ApiProperty({ description: 'Database username' })
  @IsString()
  username: string;

  @ApiProperty({ description: 'Database password' })
  @IsString()
  password: string;
}

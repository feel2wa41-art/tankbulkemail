/**
 * Scheduler DTOs
 * 스케줄러 관련 요청/응답 DTO
 */
import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  Matches,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSchedulerDto {
  @ApiProperty({ description: 'Automation ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  autoId: number;

  @ApiProperty({ description: 'Schedule type', enum: ['CRON', 'INTERVAL', 'ONCE'] })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['CRON', 'INTERVAL', 'ONCE'])
  scheduleType: string;

  @ApiPropertyOptional({ description: 'Cron expression (for CRON type)', example: '0 9 * * *' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Matches(/^(\*|([0-5]?\d))\s+(\*|([01]?\d|2[0-3]))\s+(\*|([12]?\d|3[01]))\s+(\*|([1-9]|1[0-2]))\s+(\*|([0-6]))$/, {
    message: 'Invalid cron expression format',
  })
  cronExpression?: string;

  @ApiPropertyOptional({ description: 'Interval in milliseconds (for INTERVAL type)', example: 3600000 })
  @IsNumber()
  @IsOptional()
  @Min(60000) // Minimum 1 minute
  @Max(86400000) // Maximum 24 hours
  intervalMs?: number;

  @ApiPropertyOptional({ description: 'Schedule execution time (for ONCE type)', example: '2024-01-15T09:00:00Z' })
  @IsString()
  @IsOptional()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: 'Active status', default: 'Y' })
  @IsString()
  @IsOptional()
  @IsEnum(['Y', 'N'])
  useYn?: string;
}

export class UpdateSchedulerDto {
  @ApiPropertyOptional({ description: 'Schedule type' })
  @IsString()
  @IsOptional()
  @IsEnum(['CRON', 'INTERVAL', 'ONCE'])
  scheduleType?: string;

  @ApiPropertyOptional({ description: 'Cron expression' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  cronExpression?: string;

  @ApiPropertyOptional({ description: 'Interval in milliseconds' })
  @IsNumber()
  @IsOptional()
  @Min(60000)
  @Max(86400000)
  intervalMs?: number;

  @ApiPropertyOptional({ description: 'Active status' })
  @IsString()
  @IsOptional()
  @IsEnum(['Y', 'N'])
  useYn?: string;
}

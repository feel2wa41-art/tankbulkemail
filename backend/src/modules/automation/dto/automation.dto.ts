/**
 * Automation DTOs
 * 자동화 관련 요청/응답 DTO
 */
import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  MaxLength,
  MinLength,
  IsEmail,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAutomationDto {
  @ApiProperty({ description: 'Organization ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  orgId: number;

  @ApiProperty({ description: 'Automation name', example: 'Welcome Email Campaign' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  autoName: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Active status', default: 'Y' })
  @IsString()
  @IsOptional()
  @IsEnum(['Y', 'N'])
  useYn?: string;
}

export class UpdateAutomationDto {
  @ApiPropertyOptional({ description: 'Automation name' })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  autoName?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Active status' })
  @IsString()
  @IsOptional()
  @IsEnum(['Y', 'N'])
  useYn?: string;
}

export class RegisterTargetQueryDto {
  @ApiProperty({ description: 'Target SQL Query' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  targetQuery: string;
}

export class RegisterMappingQueryDto {
  @ApiProperty({ description: 'Mapping SQL Query' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  mappingQuery: string;
}

export class RegisterUpdateQueryDto {
  @ApiProperty({ description: 'Update SQL Query' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  updateQuery: string;
}

export class SaveTemplateDto {
  @ApiProperty({ description: 'Email subject template' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  subjectTemplate: string;

  @ApiProperty({ description: 'Email body HTML template' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100000)
  bodyTemplate: string;
}

export class SaveEmailSettingDto {
  @ApiProperty({ description: 'Sender email address' })
  @IsEmail()
  @IsNotEmpty()
  senderEmail: string;

  @ApiProperty({ description: 'Sender display name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  senderName: string;

  @ApiPropertyOptional({ description: 'Reply-to email address' })
  @IsEmail()
  @IsOptional()
  replyTo?: string;

  @ApiPropertyOptional({ description: 'Email recipient field from mapping', default: 'EMAIL' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  recipientField?: string;

  @ApiPropertyOptional({ description: 'Attachment file pattern' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  attachmentPattern?: string;
}

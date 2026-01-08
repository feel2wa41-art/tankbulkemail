import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateOrgDto {
  @ApiProperty({ example: 'MTI 1부서 자동 이메일' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '1부서 자동화 그룹', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateOrgDto extends PartialType(CreateOrgDto) {}

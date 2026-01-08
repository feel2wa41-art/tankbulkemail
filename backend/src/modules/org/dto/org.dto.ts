import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateOrgDto {
  @ApiProperty({ example: 'MTI 1부서 자동 이메일' })
  @IsString()
  @IsNotEmpty()
  orgName: string;

  @ApiProperty({ example: '1부서 자동화 그룹', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateOrgDto extends PartialType(CreateOrgDto) {
  @ApiProperty({ example: 'Y', required: false })
  @IsString()
  @IsOptional()
  @IsIn(['Y', 'N'])
  useYn?: string;
}

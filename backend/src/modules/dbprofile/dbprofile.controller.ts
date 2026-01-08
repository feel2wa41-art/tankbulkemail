import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DbProfileService } from './dbprofile.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('DB Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dbprofile')
export class DbProfileController {
  constructor(private readonly dbProfileService: DbProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Get all DB profiles' })
  async findAll() {
    return this.dbProfileService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create new DB profile' })
  async create(@Body() createDto: any) {
    return this.dbProfileService.create(createDto);
  }

  @Post('test')
  @ApiOperation({ summary: 'Test DB connection' })
  async testConnection(@Body() testDto: any) {
    return this.dbProfileService.testConnection(testDto);
  }
}

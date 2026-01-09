/**
 * DB Profile Controller
 * 데이터베이스 연결 프로필 관리 API
 */
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DbProfileService } from './dbprofile.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateDbProfileDto, UpdateDbProfileDto, TestConnectionDto } from './dto';

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

  @Get(':id')
  @ApiOperation({ summary: 'Get DB profile by ID' })
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.dbProfileService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new DB profile' })
  async create(@Body() createDto: CreateDbProfileDto) {
    return this.dbProfileService.create(createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update DB profile' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateDbProfileDto,
  ) {
    return this.dbProfileService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete DB profile' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.dbProfileService.delete(id);
  }

  @Post('test')
  @ApiOperation({ summary: 'Test DB connection' })
  async testConnection(@Body() testDto: TestConnectionDto) {
    return this.dbProfileService.testConnection(testDto);
  }
}

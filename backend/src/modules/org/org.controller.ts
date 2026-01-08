import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrgService } from './org.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateOrgDto, UpdateOrgDto } from './dto/org.dto';

@ApiTags('Organization')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('org')
export class OrgController {
  constructor(private readonly orgService: OrgService) {}

  @Get()
  @ApiOperation({ summary: 'Get all organizations' })
  async findAll() {
    return this.orgService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  async findOne(@Param('id') id: number) {
    return this.orgService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new organization' })
  async create(@Body() createOrgDto: CreateOrgDto) {
    return this.orgService.create(createOrgDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update organization' })
  async update(@Param('id') id: number, @Body() updateOrgDto: UpdateOrgDto) {
    return this.orgService.update(id, updateOrgDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete organization' })
  async remove(@Param('id') id: number) {
    return this.orgService.remove(id);
  }
}

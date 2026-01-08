import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AutomationService } from './automation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Automation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('automation')
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Get()
  @ApiOperation({ summary: 'Get automations by organization' })
  async findAll(@Query('orgId') orgId: number) {
    return this.automationService.findByOrg(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get automation detail' })
  async findOne(@Param('id') id: number) {
    return this.automationService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create automation' })
  async create(@Body() createDto: any) {
    return this.automationService.create(createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update automation' })
  async update(@Param('id') id: number, @Body() updateDto: any) {
    return this.automationService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete automation' })
  async remove(@Param('id') id: number) {
    return this.automationService.remove(id);
  }

  @Post(':id/run')
  @ApiOperation({ summary: 'Manual trigger automation' })
  async run(@Param('id') id: number) {
    return this.automationService.triggerRun(id);
  }

  // DBIO Endpoints
  @Post(':id/dbio/target')
  @ApiOperation({ summary: 'Register target query' })
  async registerTarget(@Param('id') id: number, @Body() dto: any) {
    return this.automationService.registerTarget(id, dto);
  }

  @Post(':id/dbio/mapping')
  @ApiOperation({ summary: 'Register mapping query' })
  async registerMapping(@Param('id') id: number, @Body() dto: any) {
    return this.automationService.registerMapping(id, dto);
  }

  @Post(':id/dbio/update')
  @ApiOperation({ summary: 'Register update query' })
  async registerUpdate(@Param('id') id: number, @Body() dto: any) {
    return this.automationService.registerUpdate(id, dto);
  }

  // Template Endpoints
  @Get(':id/template')
  @ApiOperation({ summary: 'Get template' })
  async getTemplate(@Param('id') id: number) {
    return this.automationService.getTemplate(id);
  }

  @Post(':id/template')
  @ApiOperation({ summary: 'Save template' })
  async saveTemplate(@Param('id') id: number, @Body() dto: any) {
    return this.automationService.saveTemplate(id, dto);
  }

  @Post(':id/template/preview')
  @ApiOperation({ summary: 'Preview template' })
  async previewTemplate(@Param('id') id: number) {
    return this.automationService.previewTemplate(id);
  }

  // Email Settings
  @Post(':id/email-setting')
  @ApiOperation({ summary: 'Save email settings' })
  async saveEmailSetting(@Param('id') id: number, @Body() dto: any) {
    return this.automationService.saveEmailSetting(id, dto);
  }
}

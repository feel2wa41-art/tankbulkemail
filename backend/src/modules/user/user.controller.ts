/**
 * User Controller
 * 사용자 관리 API
 */
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto, ResetPasswordDto } from './dto';

@ApiTags('User')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  async findAll() {
    const users = await this.userService.findAll();
    return {
      success: true,
      data: users,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.userService.findById(id);
    return {
      success: true,
      data: user,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create new user' })
  async create(@Body() dto: CreateUserDto) {
    const user = await this.userService.create(dto);
    return {
      success: true,
      message: 'User created successfully',
      data: user,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    const user = await this.userService.update(id, dto);
    return {
      success: true,
      message: 'User updated successfully',
      data: user,
    };
  }

  @Post(':id/change-password')
  @ApiOperation({ summary: 'Change user password' })
  async changePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.userService.changePassword(id, dto);
    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  @Post(':id/reset-password')
  @ApiOperation({ summary: 'Reset user password (admin only)' })
  async resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResetPasswordDto,
  ) {
    await this.userService.resetPassword(id, dto);
    return {
      success: true,
      message: 'Password reset successfully',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user (soft delete)' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.userService.delete(id);
    return {
      success: true,
      message: 'User deleted successfully',
    };
  }
}

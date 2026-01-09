/**
 * User Service
 * 사용자 관리 서비스
 */
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRepository, UserEntity } from '../auth/repositories/user.repository';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto, ResetPasswordDto } from './dto';

export interface UserResponse {
  userId: number;
  userName: string;
  userEmail: string;
  role: string;
  useYn: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async findAll(): Promise<UserResponse[]> {
    const users = await this.userRepository.findAll();
    return users.map(this.toUserResponse);
  }

  async findById(userId: number): Promise<UserResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toUserResponse(user);
  }

  async create(dto: CreateUserDto): Promise<UserResponse> {
    // Check if email already exists
    const existing = await this.userRepository.findByEmail(dto.userEmail);
    if (existing) {
      throw new BadRequestException('Email already in use');
    }

    const userId = await this.userRepository.create({
      userName: dto.userName,
      userEmail: dto.userEmail,
      password: dto.password,
      role: dto.role || 'USER',
    });

    return this.findById(userId);
  }

  async update(userId: number, dto: UpdateUserDto): Promise<UserResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // If email is being changed, check for duplicates
    if (dto.userEmail && dto.userEmail !== user.USER_EMAIL) {
      const existing = await this.userRepository.findByEmail(dto.userEmail);
      if (existing) {
        throw new BadRequestException('Email already in use');
      }
    }

    // Update user - need to add update method to repository
    await this.updateUser(userId, dto);

    return this.findById(userId);
  }

  async changePassword(userId: number, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isValid = this.userRepository.verifyPassword(dto.currentPassword, user.PASSWORD_HASH);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    await this.userRepository.updatePassword(userId, dto.newPassword);
  }

  async resetPassword(userId: number, dto: ResetPasswordDto): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.updatePassword(userId, dto.newPassword);
  }

  async delete(userId: number): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.delete(userId);
  }

  private async updateUser(userId: number, dto: UpdateUserDto): Promise<void> {
    await this.userRepository.update(userId, {
      userName: dto.userName,
      userEmail: dto.userEmail,
      role: dto.role,
    });
  }

  private toUserResponse(user: UserEntity): UserResponse {
    return {
      userId: user.USER_ID,
      userName: user.USER_NAME,
      userEmail: user.USER_EMAIL,
      role: user.ROLE,
      useYn: user.USE_YN,
      createdAt: user.CREATED_AT,
      updatedAt: user.UPDATED_AT,
    };
  }
}

/**
 * Auth Service Unit Tests
 * 인증 서비스 테스트
 */
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserRepository } from './repositories/user.repository';
import { DatabaseService } from '../../config/database.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let userRepository: UserRepository;
  let databaseService: DatabaseService;

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-secret'),
  };

  const mockUserRepository = {
    findByUserId: jest.fn(),
    findById: jest.fn(),
    verifyPassword: jest.fn(),
  };

  const mockDatabaseService = {
    isConnected: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    userRepository = module.get<UserRepository>(UserRepository);
    databaseService = module.get<DatabaseService>(DatabaseService);
  });

  describe('login() - Development Mode', () => {
    beforeEach(() => {
      mockDatabaseService.isConnected.mockReturnValue(false);
    });

    it('should login with dev admin account', async () => {
      const result = await service.login({ userId: 'admin', password: 'admin123' });

      expect(result.success).toBe(true);
      expect(result.data.token).toBe('mock-jwt-token');
      expect(result.data.user.userName).toBe('Tank Admin');
      expect(result.data.user.role).toBe('admin');
      expect(mockJwtService.sign).toHaveBeenCalled();
    });

    it('should login with dev operator account', async () => {
      const result = await service.login({ userId: 'operator', password: 'operator123' });

      expect(result.success).toBe(true);
      expect(result.data.user.userName).toBe('Operator');
      expect(result.data.user.role).toBe('operator');
    });

    it('should login with dev viewer account', async () => {
      const result = await service.login({ userId: 'viewer', password: 'viewer123' });

      expect(result.success).toBe(true);
      expect(result.data.user.userName).toBe('Viewer');
      expect(result.data.user.role).toBe('viewer');
    });

    it('should throw UnauthorizedException for invalid dev credentials', async () => {
      await expect(
        service.login({ userId: 'admin', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for unknown dev user', async () => {
      await expect(
        service.login({ userId: 'unknown', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should include development mode message', async () => {
      const result = await service.login({ userId: 'admin', password: 'admin123' }) as any;

      expect(result.message).toContain('development');
    });
  });

  describe('login() - Production Mode', () => {
    beforeEach(() => {
      mockDatabaseService.isConnected.mockReturnValue(true);
    });

    it('should login with valid database user', async () => {
      const mockUser = {
        USER_ID: 1,
        USER_EMAIL: 'user@example.com',
        USER_NAME: 'Test User',
        PASSWORD_HASH: 'hashed-password',
        ROLE: 'admin',
      };

      mockUserRepository.findByUserId.mockResolvedValue(mockUser);
      mockUserRepository.verifyPassword.mockReturnValue(true);

      const result = await service.login({ userId: 'user@example.com', password: 'password123' }) as any;

      expect(result.success).toBe(true);
      expect(result.data.token).toBe('mock-jwt-token');
      expect(result.data.user.email).toBe('user@example.com');
      expect(result.data.user.userName).toBe('Test User');
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockUserRepository.findByUserId.mockResolvedValue(null);

      await expect(
        service.login({ userId: 'nonexistent@example.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const mockUser = {
        USER_ID: 1,
        USER_EMAIL: 'user@example.com',
        PASSWORD_HASH: 'hashed-password',
      };

      mockUserRepository.findByUserId.mockResolvedValue(mockUser);
      mockUserRepository.verifyPassword.mockReturnValue(false);

      await expect(
        service.login({ userId: 'user@example.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should fallback to dev mode on Oracle connection error', async () => {
      mockUserRepository.findByUserId.mockRejectedValue(new Error('ORA-12541: connection refused'));

      const result = await service.login({ userId: 'admin', password: 'admin123' }) as any;

      expect(result.success).toBe(true);
      expect(result.message).toContain('development');
    });

    it('should fallback to dev mode on NJS error', async () => {
      mockUserRepository.findByUserId.mockRejectedValue(new Error('NJS-000: connection timeout'));

      const result = await service.login({ userId: 'admin', password: 'admin123' }) as any;

      expect(result.success).toBe(true);
      expect(result.message).toContain('development');
    });

    it('should rethrow non-connection errors', async () => {
      mockUserRepository.findByUserId.mockRejectedValue(new Error('Some other error'));

      await expect(
        service.login({ userId: 'user@example.com', password: 'password' }),
      ).rejects.toThrow('Some other error');
    });
  });

  describe('validateUser()', () => {
    it('should validate user from payload in dev mode', async () => {
      mockDatabaseService.isConnected.mockReturnValue(false);

      const payload = { sub: 1, userName: 'Admin', role: 'admin' };
      const result = await service.validateUser(payload);

      expect(result).not.toBeNull();
      expect(result!.userId).toBe(1);
      expect(result!.userName).toBe('Admin');
      expect(result!.role).toBe('admin');
    });

    it('should validate user from database in production', async () => {
      mockDatabaseService.isConnected.mockReturnValue(true);

      const mockUser = {
        USER_ID: 1,
        USER_NAME: 'Test User',
        USER_EMAIL: 'user@example.com',
        ROLE: 'admin',
      };
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const payload = { sub: 1 };
      const result = await service.validateUser(payload);

      expect(result).not.toBeNull();
      expect(result!.userId).toBe(1);
      expect(result!.userName).toBe('Test User');
      expect(result!.email).toBe('user@example.com');
    });

    it('should return null if user not found in database', async () => {
      mockDatabaseService.isConnected.mockReturnValue(true);
      mockUserRepository.findById.mockResolvedValue(null);

      const payload = { sub: 999 };
      const result = await service.validateUser(payload);

      expect(result).toBeNull();
    });
  });

  describe('getMe()', () => {
    it('should return dev mode message when database not connected', async () => {
      mockDatabaseService.isConnected.mockReturnValue(false);

      const result = await service.getMe(1);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Development mode');
    });

    it('should return user data from database', async () => {
      mockDatabaseService.isConnected.mockReturnValue(true);

      const mockUser = {
        USER_ID: 1,
        USER_NAME: 'Test User',
        USER_EMAIL: 'user@example.com',
        ROLE: 'admin',
      };
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await service.getMe(1) as any;

      expect(result.success).toBe(true);
      expect(result.data.id).toBe(1);
      expect(result.data.userName).toBe('Test User');
      expect(result.data.email).toBe('user@example.com');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockDatabaseService.isConnected.mockReturnValue(true);
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.getMe(999)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('JWT Token Generation', () => {
    it('should generate JWT with correct payload for database user', async () => {
      mockDatabaseService.isConnected.mockReturnValue(true);

      const mockUser = {
        USER_ID: 1,
        USER_EMAIL: 'user@example.com',
        USER_NAME: 'Test User',
        PASSWORD_HASH: 'hashed',
        ROLE: 'admin',
      };

      mockUserRepository.findByUserId.mockResolvedValue(mockUser);
      mockUserRepository.verifyPassword.mockReturnValue(true);

      await service.login({ userId: 'user@example.com', password: 'password' });

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 1,
        userId: 'user@example.com',
        userName: 'Test User',
        role: 'admin',
      });
    });

    it('should generate JWT with correct payload for dev user', async () => {
      mockDatabaseService.isConnected.mockReturnValue(false);

      await service.login({ userId: 'admin', password: 'admin123' });

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin',
          userName: 'Tank Admin',
          role: 'admin',
        }),
      );
    });
  });
});

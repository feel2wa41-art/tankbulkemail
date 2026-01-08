import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import { UserRepository } from './repositories/user.repository';
import { DatabaseService } from '../../config/database.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
    private readonly databaseService: DatabaseService,
  ) {}

  async login(loginDto: LoginDto) {
    const { userId, password } = loginDto;

    // 데이터베이스 연결이 없는 경우 개발용 계정으로 로그인 허용
    if (!this.databaseService.isConnected()) {
      return this.devLogin(userId, password);
    }

    try {
      // 데이터베이스에서 사용자 조회
      const user = await this.userRepository.findByUserId(userId);

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // 비밀번호 검증
      if (!this.userRepository.verifyPassword(password, user.PASSWORD_HASH)) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // JWT 토큰 생성
      const payload = {
        sub: user.USER_ID,
        userId: user.USER_EMAIL,
        userName: user.USER_NAME,
        role: user.ROLE,
      };

      return {
        success: true,
        data: {
          token: this.jwtService.sign(payload),
          user: {
            id: user.USER_ID,
            userName: user.USER_NAME,
            email: user.USER_EMAIL,
            role: user.ROLE,
          },
        },
      };
    } catch (error) {
      // 데이터베이스 연결 오류 시 개발 모드로 폴백
      if (error.message?.includes('NJS-') || error.message?.includes('ORA-') || error.message?.includes('connection')) {
        return this.devLogin(userId, password);
      }
      throw error;
    }
  }

  /**
   * 개발 환경에서 DB 연결 없이 로그인 (테스트용)
   */
  private devLogin(userId: string, password: string) {
    // 개발용 기본 계정
    const devUsers = [
      { userId: 'admin', password: 'admin123', name: 'Tank Admin', role: 'admin' },
      { userId: 'operator', password: 'operator123', name: 'Operator', role: 'operator' },
      { userId: 'viewer', password: 'viewer123', name: 'Viewer', role: 'viewer' },
    ];

    const user = devUsers.find(u => u.userId === userId && u.password === password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: devUsers.indexOf(user) + 1,
      userId: user.userId,
      userName: user.name,
      role: user.role,
    };

    return {
      success: true,
      message: 'Logged in with development account (no database connection)',
      data: {
        token: this.jwtService.sign(payload),
        user: {
          id: devUsers.indexOf(user) + 1,
          userName: user.name,
          role: user.role,
        },
      },
    };
  }

  async validateUser(payload: any) {
    // 데이터베이스 연결이 없는 경우
    if (!this.databaseService.isConnected()) {
      return {
        userId: payload.sub,
        userName: payload.userName,
        role: payload.role,
      };
    }

    // 데이터베이스에서 사용자 검증
    const user = await this.userRepository.findById(payload.sub);

    if (!user) {
      return null;
    }

    return {
      userId: user.USER_ID,
      userName: user.USER_NAME,
      email: user.USER_EMAIL,
      role: user.ROLE,
    };
  }

  async getMe(userId: number) {
    if (!this.databaseService.isConnected()) {
      return {
        success: true,
        message: 'Development mode - no database connection',
      };
    }

    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      success: true,
      data: {
        id: user.USER_ID,
        userName: user.USER_NAME,
        email: user.USER_EMAIL,
        role: user.ROLE,
      },
    };
  }
}

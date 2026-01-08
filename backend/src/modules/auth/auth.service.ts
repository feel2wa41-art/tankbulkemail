import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(loginDto: LoginDto) {
    // TODO: Implement actual user validation from database
    // This is a placeholder implementation
    const { userId, password } = loginDto;

    // Mock validation - replace with actual database lookup
    if (userId === 'admin' && password === 'admin123') {
      const payload = {
        sub: 1,
        userId,
        role: 'admin',
      };

      return {
        success: true,
        data: {
          token: this.jwtService.sign(payload),
          user: {
            id: 1,
            userName: 'Tank Admin',
            role: 'admin',
          },
        },
      };
    }

    throw new UnauthorizedException('Invalid credentials');
  }

  async validateUser(payload: any) {
    // TODO: Validate user from database
    return {
      userId: payload.sub,
      userName: payload.userId,
      role: payload.role,
    };
  }
}

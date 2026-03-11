import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { utils } from 'src/common/utils';
import { JwtService } from '@nestjs/jwt';
import { AuthJwtPayload } from './types/auth-jwtPayload';
import refreshJwtConfig from './config/refresh-jwt.config';
import { ConfigType } from '@nestjs/config';
import { User } from 'src/entities';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    @Inject(refreshJwtConfig.KEY)
    private refreshTokenConfiguration: ConfigType<typeof refreshJwtConfig>,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordMatch = await utils.verifyPassword(password, user.password);

    if (!isPasswordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  login(user: User) {
    const payload: AuthJwtPayload = {
      sub: user._id,
      role: user.role,
    };
    const token = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(
      payload,
      this.refreshTokenConfiguration,
    );

    return {
      id: user._id,
      role: user.role,
      token,
      refreshToken,
    };
  }

  refreshToken(user: User) {
    const payload: AuthJwtPayload = {
      sub: user._id,
      role: user.role,
    };
    const token = this.jwtService.sign(payload);

    return {
      id: user._id,
      token,
    };
  }
}

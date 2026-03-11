import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import jwtConfig from '../config/jwt.config';
import type { ConfigType } from '@nestjs/config';
import type { AuthJwtPayload } from '../types/auth-jwtPayload';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(jwtConfig.KEY)
    private jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {
    if (!jwtConfiguration.secret) {
      throw new Error('JWT secret is not defined');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtConfiguration.secret as string,
      ignoreExpiration: false,
    });
  }

  validate(payload: AuthJwtPayload) {
    return {
      _id: payload.sub,
      role: payload.role,
    };
  }
}

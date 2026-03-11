import { registerAs } from '@nestjs/config';
import type { JwtModuleOptions } from '@nestjs/jwt';
import { config } from 'dotenv';
import type { StringValue } from 'ms';

config();

export default registerAs(
  'jwt',
  (): JwtModuleOptions => ({
    secret: process.env.JWT_SECRET,
    signOptions: {
      expiresIn: (process.env.JWT_EXPIRES_IN ?? '1h') as StringValue,
    },
  }),
);

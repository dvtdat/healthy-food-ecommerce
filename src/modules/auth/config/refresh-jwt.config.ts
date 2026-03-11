import { registerAs } from '@nestjs/config';
import type { JwtSignOptions } from '@nestjs/jwt';
import { config } from 'dotenv';
import type { StringValue } from 'ms';

config();

export default registerAs(
  'refresh-jwt',
  (): JwtSignOptions => ({
    secret: process.env.REFRESH_JWT_SECRET,
    expiresIn: process.env.REFRESH_JWT_EXPIRES_IN as StringValue,
  }),
);

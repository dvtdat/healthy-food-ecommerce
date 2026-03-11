import {
  Controller,
  Post,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth/local-auth.guard';
import { RefreshJwtAuthGuard } from './guards/refresh-jwt-auth/refresh-jwt-auth.guard';
import { User } from 'src/entities';

export interface AuthenticatedRequest extends Request {
  user: User;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Request() request: AuthenticatedRequest) {
    return this.authService.login(request.user);
  }

  @UseGuards(RefreshJwtAuthGuard)
  @Post('refresh')
  refreshToken(@Request() request: AuthenticatedRequest) {
    return this.authService.refreshToken(request.user);
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/entities';
import { RoleGuard } from 'src/common/guards/role.guard';
import {
  CurrentUser,
  CurrentUserData,
} from 'src/common/decorators/current-user.decorator';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Get()
  findAll(
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize = 10,
    @Query('pageNumber', new ParseIntPipe({ optional: true })) pageNumber = 1,
  ) {
    return this.userService.findAll(pageSize, pageNumber);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() currentUser: CurrentUserData) {
    return this.userService.getMe(currentUser._id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findById(id);
  }
  @Get('email/:email')
  findByEmail(@Param('email') email: string) {
    return this.userService.findByEmail(email);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}

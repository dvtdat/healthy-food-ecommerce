import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { Order, User } from '../../entities';

@Module({
  imports: [MikroOrmModule.forFeature([User, Order])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}

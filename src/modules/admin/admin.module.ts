import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Order, OrderItem, Product, Review, User } from 'src/entities';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([Order, OrderItem, Product, User, Review]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}

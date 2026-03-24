import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { Order, OrderItem, Payment, Product, User } from 'src/entities';

@Module({
  imports: [
    MikroOrmModule.forFeature([Order, OrderItem, Payment, Product, User]),
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}

import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import {
  Cart,
  CartItem,
  Order,
  OrderItem,
  Payment,
  Product,
  User,
  Voucher,
  VoucherUsage,
} from 'src/entities';
import { VietQRService } from 'src/common/services/vietqr.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      Cart,
      CartItem,
      Order,
      OrderItem,
      Payment,
      Product,
      User,
      Voucher,
      VoucherUsage,
    ]),
  ],
  controllers: [OrderController],
  providers: [OrderService, VietQRService],
  exports: [OrderService],
})
export class OrderModule {}

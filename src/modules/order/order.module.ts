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
} from 'src/entities';
import { VietQRService } from 'src/common/services/vietqr.service';
import { VoucherModule } from '../voucher/voucher.module';

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
    ]),
    VoucherModule,
  ],
  controllers: [OrderController],
  providers: [OrderService, VietQRService],
  exports: [OrderService],
})
export class OrderModule {}

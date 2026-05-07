import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { VoucherController } from './voucher.controller';
import { VoucherService } from './voucher.service';
import {
  Cart,
  Order,
  Product,
  User,
  Voucher,
  VoucherClaim,
  VoucherUsage,
} from 'src/entities';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      Voucher,
      VoucherUsage,
      VoucherClaim,
      Order,
      Product,
      User,
      Cart,
    ]),
  ],
  controllers: [VoucherController],
  providers: [VoucherService],
  exports: [VoucherService],
})
export class VoucherModule {}

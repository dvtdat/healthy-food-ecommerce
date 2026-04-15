import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { VoucherController } from './voucher.controller';
import { VoucherService } from './voucher.service';
import { Voucher, VoucherUsage } from 'src/entities';

@Module({
  imports: [MikroOrmModule.forFeature([Voucher, VoucherUsage])],
  controllers: [VoucherController],
  providers: [VoucherService],
  exports: [VoucherService],
})
export class VoucherModule {}

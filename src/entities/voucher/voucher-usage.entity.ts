import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../base/base.entity';
import { Voucher } from './voucher.entity';
import { User } from '../user/user.entity';
import { Order } from '../order/order.entity';

@Entity()
export class VoucherUsage extends BaseEntity {
  @ApiProperty({ type: () => Voucher })
  @ManyToOne(() => Voucher)
  voucher!: Voucher;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User)
  user!: User;

  @ApiProperty({ type: () => Order })
  @ManyToOne(() => Order)
  order!: Order;

  @ApiProperty()
  @Property()
  usedAt: Date = new Date();

  constructor(voucher: Voucher, user: User, order: Order) {
    super();
    this.voucher = voucher;
    this.user = user;
    this.order = order;
  }
}

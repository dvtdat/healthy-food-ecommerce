import { Entity, ManyToOne, Property, Index } from '@mikro-orm/core';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../base/base.entity';
import { Voucher } from './voucher.entity';
import { User } from '../user/user.entity';

@Entity()
@Index({ properties: ['user', 'voucher'] })
export class VoucherClaim extends BaseEntity {
  @ApiProperty({ type: () => Voucher })
  @ManyToOne(() => Voucher)
  voucher!: Voucher;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User)
  user!: User;

  @ApiProperty()
  @Property()
  claimedAt: Date = new Date();

  @ApiPropertyOptional()
  @Property({ nullable: true })
  usedAt?: Date;

  constructor(voucher: Voucher, user: User) {
    super();
    this.voucher = voucher;
    this.user = user;
  }
}

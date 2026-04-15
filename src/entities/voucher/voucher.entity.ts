import { Entity, Enum, Property } from '@mikro-orm/core';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../base/base.entity';

export enum VoucherType {
  PERCENT = 'percent',
  FIXED = 'fixed',
}

@Entity()
export class Voucher extends BaseEntity {
  @ApiProperty({ example: 'SUMMER10' })
  @Property({ unique: true })
  code!: string;

  @ApiProperty({ enum: VoucherType, example: VoucherType.PERCENT })
  @Enum(() => VoucherType)
  type!: VoucherType;

  @ApiProperty({
    example: 10,
    description: 'Percent (10 = 10%) or fixed amount (VND)',
  })
  @Property({ type: 'number' })
  value!: number;

  @ApiPropertyOptional({
    example: 100000,
    description: 'Min order subtotal to apply voucher',
  })
  @Property({ type: 'number', nullable: true })
  minOrderAmount?: number;

  @ApiPropertyOptional({
    example: 50000,
    description: 'Max discount cap (for percent type)',
  })
  @Property({ type: 'number', nullable: true })
  maxDiscount?: number;

  @ApiPropertyOptional({
    example: 100,
    description: 'Total usage limit across all users',
  })
  @Property({ type: 'number', nullable: true })
  usageLimit?: number;

  @ApiProperty({ example: 0 })
  @Property({ type: 'number' })
  usedCount = 0;

  @ApiPropertyOptional({
    example: 1,
    description: 'Max times a single user can use this voucher',
  })
  @Property({ type: 'number', nullable: true })
  perUserLimit?: number;

  @ApiProperty()
  @Property()
  validFrom!: Date;

  @ApiProperty()
  @Property()
  validTo!: Date;

  @ApiProperty({ example: true })
  @Property()
  isActive = true;

  constructor(
    code: string,
    type: VoucherType,
    value: number,
    validFrom: Date,
    validTo: Date,
    options?: {
      minOrderAmount?: number;
      maxDiscount?: number;
      usageLimit?: number;
      perUserLimit?: number;
    },
  ) {
    super();
    this.code = code;
    this.type = type;
    this.value = value;
    this.validFrom = validFrom;
    this.validTo = validTo;
    if (options) {
      this.minOrderAmount = options.minOrderAmount;
      this.maxDiscount = options.maxDiscount;
      this.usageLimit = options.usageLimit;
      this.perUserLimit = options.perUserLimit;
    }
  }
}

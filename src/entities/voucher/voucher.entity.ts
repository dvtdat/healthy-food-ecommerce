import { Entity, Enum, Property } from '@mikro-orm/core';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ObjectId } from '@mikro-orm/mongodb';
import { BaseEntity } from '../base/base.entity';

export enum VoucherType {
  PERCENT = 'percent',
  FIXED = 'fixed',
  FREE_SHIPPING = 'free_shipping',
}

export enum VoucherStatus {
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  PAUSED = 'paused',
  EXPIRED = 'expired',
  EXHAUSTED = 'exhausted',
}

@Entity()
export class Voucher extends BaseEntity {
  @ApiProperty({ example: 'SUMMER10' })
  @Property({ unique: true })
  code!: string;

  @ApiProperty({ example: 'Summer Flash Sale' })
  @Property()
  name!: string;

  @ApiPropertyOptional({
    example: 'Get 10% off everything in our summer collection.',
  })
  @Property({ nullable: true, type: 'text' })
  description?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/banner.jpg' })
  @Property({ nullable: true })
  bannerImage?: string;

  @ApiProperty({ enum: VoucherType, example: VoucherType.PERCENT })
  @Enum(() => VoucherType)
  type!: VoucherType;

  @ApiProperty({
    example: 10,
    description:
      'Percent (10 = 10%), fixed VND amount, or 0 for FREE_SHIPPING (uses deliveryFee).',
  })
  @Property({ type: 'number' })
  value = 0;

  @ApiPropertyOptional({ example: 100000, description: 'Min order subtotal' })
  @Property({ type: 'number', nullable: true })
  minOrderAmount?: number;

  @ApiPropertyOptional({
    example: 50000,
    description: 'Max discount cap (percent only)',
  })
  @Property({ type: 'number', nullable: true })
  maxDiscount?: number;

  @ApiPropertyOptional({
    example: 100,
    description: 'Total usage cap across all users',
  })
  @Property({ type: 'number', nullable: true })
  usageLimit?: number;

  @ApiProperty({ example: 0 })
  @Property({ type: 'number' })
  usedCount = 0;

  @ApiPropertyOptional({ example: 1, description: 'Max uses per user' })
  @Property({ type: 'number', nullable: true })
  perUserLimit?: number;

  @ApiProperty({ example: false })
  @Property()
  firstOrderOnly = false;

  @ApiPropertyOptional({
    type: [String],
    description: 'Restrict to these product IDs. Empty = all products.',
  })
  @Property({ type: 'array', nullable: true })
  applicableProductIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Restrict to these category IDs. Empty = all categories.',
  })
  @Property({ type: 'array', nullable: true })
  applicableCategoryIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @Property({ type: 'array', nullable: true })
  excludedProductIds?: string[];

  @ApiProperty({
    example: 0,
    description: 'Higher = preferred when auto-suggesting best voucher',
  })
  @Property({ type: 'number' })
  priority = 0;

  @ApiProperty({
    example: false,
    description:
      'If true, user must claim before use. If false, anyone can apply by code.',
  })
  @Property()
  isClaimable = false;

  @ApiProperty({ example: true })
  @Property()
  isStackableWithShipping = true;

  @ApiProperty()
  @Property()
  validFrom!: Date;

  @ApiProperty()
  @Property()
  validTo!: Date;

  @ApiProperty({ example: true })
  @Property()
  isActive = true;

  /**
   * Computed status — not stored. Resolved at read time.
   */
  computedStatus(now: Date = new Date()): VoucherStatus {
    if (!this.isActive) return VoucherStatus.PAUSED;
    if (now > this.validTo) return VoucherStatus.EXPIRED;
    if (now < this.validFrom) return VoucherStatus.SCHEDULED;
    if (this.usageLimit !== undefined && this.usedCount >= this.usageLimit) {
      return VoucherStatus.EXHAUSTED;
    }
    return VoucherStatus.ACTIVE;
  }

  constructor(
    code: string,
    name: string,
    type: VoucherType,
    value: number,
    validFrom: Date,
    validTo: Date,
    options?: {
      description?: string;
      bannerImage?: string;
      minOrderAmount?: number;
      maxDiscount?: number;
      usageLimit?: number;
      perUserLimit?: number;
      firstOrderOnly?: boolean;
      applicableProductIds?: string[];
      applicableCategoryIds?: string[];
      excludedProductIds?: string[];
      priority?: number;
      isClaimable?: boolean;
      isStackableWithShipping?: boolean;
    },
  ) {
    super();
    this.code = code;
    this.name = name;
    this.type = type;
    this.value = value;
    this.validFrom = validFrom;
    this.validTo = validTo;
    if (options) {
      this.description = options.description;
      this.bannerImage = options.bannerImage;
      this.minOrderAmount = options.minOrderAmount;
      this.maxDiscount = options.maxDiscount;
      this.usageLimit = options.usageLimit;
      this.perUserLimit = options.perUserLimit;
      this.firstOrderOnly = options.firstOrderOnly ?? false;
      this.applicableProductIds = options.applicableProductIds;
      this.applicableCategoryIds = options.applicableCategoryIds;
      this.excludedProductIds = options.excludedProductIds;
      this.priority = options.priority ?? 0;
      this.isClaimable = options.isClaimable ?? false;
      this.isStackableWithShipping = options.isStackableWithShipping ?? true;
    }
  }
}

export type VoucherTargetingIds = ObjectId[] | string[];

import {
  Collection,
  Embeddable,
  Embedded,
  Entity,
  Enum,
  ManyToOne,
  OneToMany,
  OneToOne,
  Property,
} from '@mikro-orm/core';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../base/base.entity';
import { User } from '../user/user.entity';
import { OrderItem } from './order-item.entity';
import { Payment } from '../payment/payment.entity';
import { DeliveryOption } from 'src/common/config/delivery.config';

@Embeddable()
export class StatusHistoryEntry {
  @ApiProperty({ example: 'pending' })
  @Property()
  status!: string;

  @ApiProperty()
  @Property()
  changedAt: Date = new Date();

  @ApiPropertyOptional()
  @Property({ nullable: true })
  note?: string;

  constructor(status: string, note?: string) {
    this.status = status;
    this.note = note;
  }
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

@Entity()
export class Order extends BaseEntity {
  @ApiProperty({ type: () => User })
  @ManyToOne(() => User)
  user!: User;

  @ApiPropertyOptional({ type: () => [OrderItem] })
  @OneToMany(() => OrderItem, (item) => item.order)
  items = new Collection<OrderItem>(this);

  @ApiPropertyOptional({ type: () => Payment })
  @OneToOne(() => Payment, (payment) => payment.order, {
    nullable: true,
    lazy: true,
  })
  payment?: Payment;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PENDING })
  @Enum(() => OrderStatus)
  status: OrderStatus = OrderStatus.PENDING;

  @ApiProperty({ type: () => [StatusHistoryEntry] })
  @Embedded(() => StatusHistoryEntry, { array: true })
  statusHistory: StatusHistoryEntry[] = [];

  @ApiProperty({ enum: DeliveryOption, example: DeliveryOption.STANDARD })
  @Enum(() => DeliveryOption)
  deliveryOption!: DeliveryOption;

  @ApiProperty({ example: 20000 })
  @Property({ type: 'number' })
  deliveryFee!: number;

  @ApiProperty({ example: 130000 })
  @Property({ type: 'number' })
  subtotal!: number;

  @ApiProperty({ example: 0 })
  @Property({ type: 'number' })
  discountAmount = 0;

  @ApiPropertyOptional({ example: 'SUMMER10' })
  @Property({ nullable: true })
  voucherCode?: string;

  @ApiProperty({ example: 150000 })
  @Property({ type: 'number' })
  totalAmount!: number;

  @ApiProperty({ example: '123 Nguyen Hue, District 1, HCMC' })
  @Property()
  shippingAddress!: string;

  @ApiPropertyOptional({ example: 'Please call before delivery' })
  @Property({ nullable: true })
  notes?: string;

  @ApiPropertyOptional({ example: 'VN123456789' })
  @Property({ nullable: true })
  trackingNumber?: string;

  @ApiPropertyOptional({ example: 'Giao Hang Nhanh' })
  @Property({ nullable: true })
  courierName?: string;

  @ApiPropertyOptional()
  @Property({ nullable: true })
  estimatedDeliveryDate?: Date;

  @ApiPropertyOptional()
  @Property({ nullable: true })
  actualDeliveryDate?: Date;

  constructor(
    user: User,
    subtotal: number,
    deliveryOption: DeliveryOption,
    deliveryFee: number,
    shippingAddress: string,
    discountAmount = 0,
    voucherCode?: string,
    notes?: string,
  ) {
    super();
    this.user = user;
    this.subtotal = subtotal;
    this.deliveryOption = deliveryOption;
    this.deliveryFee = deliveryFee;
    this.discountAmount = discountAmount;
    this.voucherCode = voucherCode;
    this.totalAmount = subtotal + deliveryFee - discountAmount;
    this.shippingAddress = shippingAddress;
    this.notes = notes;
    this.statusHistory = [new StatusHistoryEntry(OrderStatus.PENDING)];
  }
}

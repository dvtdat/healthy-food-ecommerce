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
import { BaseEntity } from '../base/base.entity';
import { User } from '../user/user.entity';
import { OrderItem } from './order-item.entity';
import { Payment } from '../payment/payment.entity';

@Embeddable()
export class StatusHistoryEntry {
  @Property()
  status!: string;

  @Property()
  changedAt: Date = new Date();

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
  @ManyToOne(() => User)
  user!: User;

  @OneToMany(() => OrderItem, (item) => item.order)
  items = new Collection<OrderItem>(this);

  @OneToOne(() => Payment, (payment) => payment.order, {
    nullable: true,
    lazy: true,
  })
  payment?: Payment;

  @Enum(() => OrderStatus)
  status: OrderStatus = OrderStatus.PENDING;

  @Embedded(() => StatusHistoryEntry, { array: true })
  statusHistory: StatusHistoryEntry[] = [];

  @Property({ type: 'number' })
  totalAmount!: number;

  @Property()
  shippingAddress!: string;

  @Property({ nullable: true })
  notes?: string;

  @Property({ nullable: true })
  trackingNumber?: string;

  @Property({ nullable: true })
  courierName?: string;

  @Property({ nullable: true })
  estimatedDeliveryDate?: Date;

  @Property({ nullable: true })
  actualDeliveryDate?: Date;

  constructor(
    user: User,
    totalAmount: number,
    shippingAddress: string,
    notes?: string,
  ) {
    super();
    this.user = user;
    this.totalAmount = totalAmount;
    this.shippingAddress = shippingAddress;
    this.notes = notes;
    this.statusHistory = [new StatusHistoryEntry(OrderStatus.PENDING)];
  }
}

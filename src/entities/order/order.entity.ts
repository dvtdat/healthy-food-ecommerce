import {
  Collection,
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

  @Property({ type: 'number' })
  totalAmount!: number;

  @Property()
  shippingAddress!: string;

  @Property({ nullable: true })
  notes?: string;

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
  }
}

import {
  Collection,
  Entity,
  Enum,
  ManyToOne,
  OneToMany,
  Property,
} from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { OrderItem } from './order-item.entity';

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

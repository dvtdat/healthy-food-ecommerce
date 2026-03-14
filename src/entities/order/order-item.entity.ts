import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../base/base.entity';
import { Product } from '../product/product.entity';
import { Order } from './order.entity';

@Entity()
export class OrderItem extends BaseEntity {
  @ManyToOne(() => Order)
  order!: Order;

  @ManyToOne(() => Product)
  product!: Product;

  @Property({ type: 'number' })
  quantity!: number;

  @Property({ type: 'number' })
  unitPrice!: number;

  constructor(
    order: Order,
    product: Product,
    quantity: number,
    unitPrice: number,
  ) {
    super();
    this.order = order;
    this.product = product;
    this.quantity = quantity;
    this.unitPrice = unitPrice;
  }
}

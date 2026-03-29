import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../base/base.entity';
import { Product } from '../product/product.entity';
import { Order } from './order.entity';

@Entity()
export class OrderItem extends BaseEntity {
  @ManyToOne(() => Order)
  order!: Order;

  @ApiProperty({ type: () => Product })
  @ManyToOne(() => Product)
  product!: Product;

  @ApiProperty({ example: 2 })
  @Property({ type: 'number' })
  quantity!: number;

  @ApiProperty({ example: 29000 })
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

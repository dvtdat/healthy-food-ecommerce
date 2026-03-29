import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../base/base.entity';
import { Cart } from './cart.entity';
import { Product } from '../product/product.entity';

@Entity()
export class CartItem extends BaseEntity {
  @ManyToOne(() => Cart)
  cart!: Cart;

  @ApiProperty({ type: () => Product })
  @ManyToOne(() => Product)
  product!: Product;

  @ApiProperty({ example: 2 })
  @Property({ type: 'number' })
  quantity!: number;

  constructor(cart: Cart, product: Product, quantity: number) {
    super();
    this.cart = cart;
    this.product = product;
    this.quantity = quantity;
  }
}

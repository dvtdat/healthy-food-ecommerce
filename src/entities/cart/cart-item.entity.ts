import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../base/base.entity';
import { Cart } from './cart.entity';
import { Product } from '../product/product.entity';

@Entity()
export class CartItem extends BaseEntity {
  @ManyToOne(() => Cart)
  cart!: Cart;

  @ManyToOne(() => Product)
  product!: Product;

  @Property({ type: 'number' })
  quantity!: number;

  constructor(cart: Cart, product: Product, quantity: number) {
    super();
    this.cart = cart;
    this.product = product;
    this.quantity = quantity;
  }
}

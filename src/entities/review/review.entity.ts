import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../base/base.entity';
import { User } from '../user/user.entity';
import { Product } from '../product/product.entity';

@Entity()
export class Review extends BaseEntity {
  @ManyToOne(() => User)
  user!: User;

  @ManyToOne(() => Product)
  product!: Product;

  @Property({ type: 'number' })
  rating!: number;

  @Property({ nullable: true })
  comment?: string;

  constructor(user: User, product: Product, rating: number, comment?: string) {
    super();
    this.user = user;
    this.product = product;
    this.rating = rating;
    this.comment = comment;
  }
}

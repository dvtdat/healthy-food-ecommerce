import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../base/base.entity';
import { User } from '../user/user.entity';
import { Product } from '../product/product.entity';

@Entity()
export class Review extends BaseEntity {
  @ApiProperty({ type: () => User })
  @ManyToOne(() => User)
  user!: User;

  @ApiProperty({ type: () => Product })
  @ManyToOne(() => Product)
  product!: Product;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @Property({ type: 'number' })
  rating!: number;

  @ApiPropertyOptional({ example: 'Great product!' })
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

import { Collection, Entity, ManyToOne, OneToMany } from '@mikro-orm/core';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../base/base.entity';
import { User } from '../user/user.entity';
import { CartItem } from './cart-item.entity';

@Entity()
export class Cart extends BaseEntity {
  @ApiProperty({ type: () => User })
  @ManyToOne(() => User)
  user!: User;

  @ApiPropertyOptional({ type: () => [CartItem] })
  @OneToMany(() => CartItem, (item) => item.cart)
  items = new Collection<CartItem>(this);

  constructor(user: User) {
    super();
    this.user = user;
  }
}

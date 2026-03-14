import { Collection, Entity, ManyToOne, OneToMany } from '@mikro-orm/core';
import { BaseEntity } from '../base/base.entity';
import { User } from '../user/user.entity';
import { CartItem } from './cart-item.entity';

@Entity()
export class Cart extends BaseEntity {
  @ManyToOne(() => User)
  user!: User;

  @OneToMany(() => CartItem, (item) => item.cart)
  items = new Collection<CartItem>(this);

  constructor(user: User) {
    super();
    this.user = user;
  }
}

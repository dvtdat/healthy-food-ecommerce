import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { Category } from './category.entity';

@Entity()
export class Product extends BaseEntity {
  @Property()
  name!: string;

  @Property({ unique: true })
  slug!: string;

  @Property({ nullable: true })
  description?: string;

  @Property({ type: 'number' })
  price!: number;

  @Property({ type: 'number' })
  stock!: number;

  @Property({ nullable: true })
  imageUrl?: string;

  @ManyToOne(() => Category)
  category!: Category;

  constructor(
    name: string,
    slug: string,
    price: number,
    stock: number,
    category: Category,
    description?: string,
    imageUrl?: string,
  ) {
    super();
    this.name = name;
    this.slug = slug;
    this.price = price;
    this.stock = stock;
    this.category = category;
    this.description = description;
    this.imageUrl = imageUrl;
  }
}

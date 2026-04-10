import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../base/base.entity';
import { Category } from '../category/category.entity';

@Entity()
export class Product extends BaseEntity {
  @ApiProperty({ example: 'Organic Broccoli' })
  @Property()
  name!: string;

  @ApiProperty({ example: 'organic-broccoli' })
  @Property({ unique: true })
  slug!: string;

  @ApiPropertyOptional({ example: 'Fresh organic broccoli from local farms' })
  @Property({ nullable: true })
  description?: string;

  @ApiProperty({ example: 29000 })
  @Property({ type: 'number' })
  price!: number;

  @ApiProperty({ example: 100 })
  @Property({ type: 'number' })
  stock!: number;

  @ApiPropertyOptional({ example: 'https://example.com/broccoli.jpg' })
  @Property({ nullable: true })
  imageUrl?: string;

  @ApiProperty({ example: 42 })
  @Property({ type: 'number', default: 0 })
  viewCount = 0;

  @ApiProperty({ type: () => Category })
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

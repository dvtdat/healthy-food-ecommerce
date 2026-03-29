import { Entity, Property } from '@mikro-orm/core';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../base/base.entity';

@Entity()
export class Category extends BaseEntity {
  @ApiProperty({ example: 'Vegetables' })
  @Property({ unique: true })
  name!: string;

  @ApiProperty({ example: 'vegetables' })
  @Property({ unique: true })
  slug!: string;

  @ApiPropertyOptional({ example: 'Fresh organic vegetables' })
  @Property({ nullable: true })
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @Property({ nullable: true })
  imageUrl?: string;

  constructor(
    name: string,
    slug: string,
    description?: string,
    imageUrl?: string,
  ) {
    super();
    this.name = name;
    this.slug = slug;
    this.description = description;
    this.imageUrl = imageUrl;
  }
}

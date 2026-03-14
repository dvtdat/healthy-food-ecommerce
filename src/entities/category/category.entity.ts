import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../base/base.entity';

@Entity()
export class Category extends BaseEntity {
  @Property({ unique: true })
  name!: string;

  @Property({ unique: true })
  slug!: string;

  @Property({ nullable: true })
  description?: string;

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

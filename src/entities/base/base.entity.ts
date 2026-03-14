import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';

@Entity({ abstract: true })
export abstract class BaseEntity {
  @PrimaryKey()
  _id!: ObjectId;

  @Property({ type: 'timestamptz', defaultRaw: 'current_timestamp' })
  createdAt = new Date();

  @Property({
    type: 'timestamptz',
    onUpdate: () => new Date(),
    defaultRaw: 'current_timestamp',
  })
  updatedAt = new Date();

  @Property({ type: 'timestamptz', nullable: true })
  deletedAt?: Date;
}

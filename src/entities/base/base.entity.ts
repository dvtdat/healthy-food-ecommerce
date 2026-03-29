import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity({ abstract: true })
export abstract class BaseEntity {
  @ApiProperty({ type: 'string', example: '507f1f77bcf86cd799439011' })
  @PrimaryKey()
  _id!: ObjectId;

  @ApiProperty()
  @Property({ type: 'timestamptz', defaultRaw: 'current_timestamp' })
  createdAt = new Date();

  @ApiProperty()
  @Property({
    type: 'timestamptz',
    onUpdate: () => new Date(),
    defaultRaw: 'current_timestamp',
  })
  updatedAt = new Date();

  @ApiPropertyOptional()
  @Property({ type: 'timestamptz', nullable: true })
  deletedAt?: Date;
}

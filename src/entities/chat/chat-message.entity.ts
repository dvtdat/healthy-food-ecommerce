import { Entity, Enum, Index, Property } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../base/base.entity';

export enum ChatRole {
  USER = 'user',
  MODEL = 'model',
}

@Entity()
export class ChatMessage extends BaseEntity {
  @ApiProperty({ type: 'string', example: '507f1f77bcf86cd799439011' })
  @Index()
  @Property()
  userId!: ObjectId;

  @ApiProperty({ enum: ChatRole })
  @Enum(() => ChatRole)
  role!: ChatRole;

  @ApiProperty({ example: 'Shop có những sản phẩm nào?' })
  @Property({ type: 'string' })
  text!: string;

  @ApiProperty({ example: false })
  @Property({ default: false })
  isImportant = false;

  constructor(
    userId: ObjectId,
    role: ChatRole,
    text: string,
    isImportant = false,
  ) {
    super();
    this.userId = userId;
    this.role = role;
    this.text = text;
    this.isImportant = isImportant;
  }
}

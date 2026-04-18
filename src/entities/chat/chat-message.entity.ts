import { Entity, Enum, Property } from '@mikro-orm/core';
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
  @Property()
  userId!: ObjectId;

  @ApiProperty({ enum: ChatRole })
  @Enum(() => ChatRole)
  role!: ChatRole;

  @ApiProperty({ example: 'Shop có những sản phẩm nào?' })
  @Property({ type: 'string' })
  text!: string;

  constructor(userId: ObjectId, role: ChatRole, text: string) {
    super();
    this.userId = userId;
    this.role = role;
    this.text = text;
  }
}

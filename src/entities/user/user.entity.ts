import { Entity, Enum, Property } from '@mikro-orm/core';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../base/base.entity';

export enum UserRole {
  GUEST = 'guest',
  USER = 'user',
  ADMIN = 'admin',
}

@Entity()
export class User extends BaseEntity {
  @ApiProperty({ example: 'user@example.com' })
  @Property({ unique: true })
  email!: string;

  @ApiProperty({ example: 'John' })
  @Property()
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @Property()
  lastName!: string;

  @ApiHideProperty()
  @Property()
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.USER })
  @Enum(() => UserRole)
  role: UserRole;

  @ApiProperty({ example: true })
  @Property({ default: true })
  isActive = true;

  constructor(
    email: string,
    firstName: string,
    lastName: string,
    password: string,
    role: UserRole = UserRole.USER,
  ) {
    super();
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.password = password;
    this.role = role;
  }
}

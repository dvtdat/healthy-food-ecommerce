import { Entity, Enum, Property } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';

export enum UserRole {
  GUEST = 'guest',
  USER = 'user',
  ADMIN = 'admin',
}

@Entity()
export class User extends BaseEntity {
  @Property({ unique: true })
  email!: string;

  @Property()
  firstName!: string;

  @Property()
  lastName!: string;

  @Property()
  password: string;

  @Enum(() => UserRole)
  role: UserRole;

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

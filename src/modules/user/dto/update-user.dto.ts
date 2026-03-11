import type { UserRole } from 'src/entities';

export class UpdateUserDto {
  email!: string;
  firstName!: string;
  lastName!: string;
  password!: string;
  role: UserRole;
}

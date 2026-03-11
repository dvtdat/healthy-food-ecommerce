import type { ObjectId } from '@mikro-orm/mongodb';
import type { UserRole } from 'src/entities';

export interface AuthJwtPayload {
  sub: ObjectId;
  role: UserRole;
}

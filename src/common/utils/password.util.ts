import * as bcrypt from 'bcrypt';

const BCRYPT_SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

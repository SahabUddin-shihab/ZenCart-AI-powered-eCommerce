import * as bcrypt from 'bcryptjs';

export const hashPassword = (password: string): Promise<string> =>
  bcrypt.hash(password, 12);

export const comparePassword = (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);

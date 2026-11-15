import { User } from '@prisma/client';

/**
 * Excludes sensitive password hash from API responses.
 */
export function sanitizeUser(user: User): Omit<User, 'password'> {
  const { password: _password, ...sanitized } = user;
  void _password;
  return sanitized;
}

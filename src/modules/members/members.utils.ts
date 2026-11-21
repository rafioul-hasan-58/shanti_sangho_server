import { Member } from '@prisma/client';

/**
 * Excludes sensitive password hash from API responses.
 */
export function sanitizeMember(member: Member): Omit<Member, 'password'> {
  const { password: _password, ...sanitized } = member;
  void _password;
  return sanitized;
}

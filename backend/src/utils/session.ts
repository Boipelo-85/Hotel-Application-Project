import { createHash } from 'node:crypto';

export function hashSessionToken(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}

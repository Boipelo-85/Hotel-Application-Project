import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<Buffer> {
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  return Buffer.from(hash);
}

export async function verifyPassword(password: string, hash: Buffer): Promise<boolean> {
  const hashString = hash.toString('utf-8');
  return await bcrypt.compare(password, hashString);
}

export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character' };
  }
  return { valid: true };
}

export function validatePhoneNumber(phone: string): boolean {
  // South African phone numbers: 0821234567 or +27821234567
  const cleaned = phone.replace(/\s/g, '');
  const saPhoneRegex = /^(\+27|0)[0-9]{9}$/;
  return saPhoneRegex.test(cleaned);
}

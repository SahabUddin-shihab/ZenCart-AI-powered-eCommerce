import slugify from 'slugify';
import { v4 as uuidv4 } from 'uuid';

export const generateSlug = (text: string): string =>
  slugify(text, { lower: true, strict: true, trim: true });

export const generateOrderNumber = (): string => {
  const now = new Date();
  const ts = now.getFullYear().toString().slice(2) +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `ORD-${ts}-${rand}`;
};

export const generateTicketNumber = (): string => {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TKT-${rand}`;
};

export const generateReferralCode = (length = 8): string =>
  Math.random().toString(36).substring(2, 2 + length).toUpperCase();

export const maskEmail = (email: string): string => {
  const [name, domain] = email.split('@');
  return `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}@${domain}`;
};

export const generateOtp = (length = 6): string =>
  Math.floor(Math.pow(10, length - 1) + Math.random() * 9 * Math.pow(10, length - 1)).toString();

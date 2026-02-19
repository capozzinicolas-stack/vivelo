import { SKU_PREFIXES } from './constants';

function randomAlphaNum(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1 to avoid confusion
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateServiceSku(category: string): string {
  const prefix = SKU_PREFIXES[category] || 'XX';
  return `${prefix}-${randomAlphaNum(4)}`;
}

export function generateExtraSku(serviceSku: string, index: number): string {
  return `${serviceSku}-EX${index + 1}`;
}

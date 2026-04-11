import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(prefix: string = '') {
  const id = crypto.randomUUID();
  return prefix ? `${prefix}-${id}` : id;
}

export function countWords(text: string): number {
  if (!text.trim()) return 0;
  // Korean: count characters (excluding spaces/punctuation)
  const korean = text.match(/[\uAC00-\uD7AF\u3130-\u318F]/g)?.length ?? 0;
  // English/other: count word tokens
  const nonKorean = text.replace(/[\uAC00-\uD7AF\u3130-\u318F]/g, ' ').trim();
  const words = nonKorean ? nonKorean.split(/\s+/).filter((w) => w.length > 0).length : 0;
  return korean + words;
}

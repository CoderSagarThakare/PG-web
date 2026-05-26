import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes safely — handles conflicts and conditionals.
 * @param {...(string|undefined|null|false|Record<string,boolean>)} inputs
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

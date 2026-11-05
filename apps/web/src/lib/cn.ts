import { twMerge } from 'tailwind-merge';

/**
 * Une clases filtrando valores no-string y resolviendo conflictos de Tailwind
 * (la última definición gana): cn('bg-accent-soft', 'bg-vendedor-primary') → 'bg-vendedor-primary'.
 */
export function cn(
  ...classes: Array<string | false | null | undefined | number | bigint>
): string {
  return twMerge(classes.filter((c): c is string => typeof c === 'string' && c.length > 0).join(' '));
}

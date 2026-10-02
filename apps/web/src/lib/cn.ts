/**
 * Une clases condicionales filtrando valores que no sean strings.
 * cn('a', cond && 'b', className) → 'a b'
 */
export function cn(
  ...classes: Array<string | false | null | undefined | number | bigint>
): string {
  return classes.filter((c): c is string => typeof c === 'string' && c.length > 0).join(' ');
}

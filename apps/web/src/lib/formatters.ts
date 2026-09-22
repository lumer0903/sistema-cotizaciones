export const formatCode = (code: string): string => code.toUpperCase().trim();

export const formatText = (text: string): string =>
  text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export const formatPrice = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'S/ 0.00';
  return `S/ ${num.toFixed(2)}`;
};
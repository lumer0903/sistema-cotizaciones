export const money = value => `S/ ${Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const date = value => new Date(value).toLocaleDateString('es-PE');
export const initials = value => String(value || 'US').split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();

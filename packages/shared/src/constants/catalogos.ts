export const CATALOGOS = {
  CATEGORIA: ['FLOR', 'FOLLAJE', 'ADORNO'] as const,
  PRESENTACION: ['Ramo solo', 'Ramo con follaje', 'Solo follaje', 'Flor unitaria'] as const,
  MATERIAL: ['Tela Simple', 'Tela Premium', 'Terciopelo', 'Seda', 'Silicona', 'Plástico'] as const,
  TIPO_FLOR: ['Rosa', 'Girasol', 'Orquídea', 'Tulipán', 'Lirio', 'Peonía', 'No aplica / Follaje'] as const,
  UBICACION: ['ALMACÉN PRINCIPAL'] as const,
} as const;

export type Categoria = typeof CATALOGOS.CATEGORIA[number];
export type Presentacion = typeof CATALOGOS.PRESENTACION[number];
export type Material = typeof CATALOGOS.MATERIAL[number];
export type TipoFlor = typeof CATALOGOS.TIPO_FLOR[number];
export type Ubicacion = typeof CATALOGOS.UBICACION[number];
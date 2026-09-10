export class QuoteEntity {
  id_cotizacion!: number;
  numero!: string;
  id_cliente?: number;
  id_usuario?: number;
  subtotal!: number;
  igv!: number;
  total!: number;
  estado!: string;
  created_at!: Date;

  constructor(partial: Partial<QuoteEntity>) {
    Object.assign(this, partial);
  }

  // Domain logic example
  calculateTotals(items: any[]) {
    // calculation logic...
  }
}

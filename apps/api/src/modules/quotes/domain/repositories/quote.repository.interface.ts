import { QuoteEntity } from '../entities/quote.entity';

export const IQuoteRepository = Symbol('IQuoteRepository');

export interface PaginatedQuotesResponse {
  data: QuoteEntity[];
  total: number;
  page: number;
  limit: number;
}

export interface QuoteFilters {
  estado?: string;
  id_cliente?: number;
  id_usuario?: number;
  fecha_inicio?: Date;
  fecha_fin?: Date;
}

export interface IQuoteRepository {
  save(quote: QuoteEntity): Promise<QuoteEntity>;
  findById(id: number): Promise<QuoteEntity | null>;
  findAll(): Promise<QuoteEntity[]>;
  findPaginated(page: number, limit: number, filters?: QuoteFilters): Promise<PaginatedQuotesResponse>;
}

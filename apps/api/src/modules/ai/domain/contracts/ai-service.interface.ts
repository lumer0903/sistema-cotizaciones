export const IAiService = Symbol('IAiService');

export interface AiRecommendationItem {
  id: number;
  codigo: string;
  descripcion: string;
  precio: number;
  stock: number;
  similarityScore: number;
  categoria?: string;
  margen?: number;
}

export interface AiRecommendationResponse {
  similar: AiRecommendationItem[];
  upsell: AiRecommendationItem[];
  equilibrio: AiRecommendationItem[];
}

export interface IAiService {
  generateQuoteSuggestions(data: any): Promise<any>;
  recommendItem(data: {
    id_producto: number;
    id_cliente?: number;
    id_almacen?: number;
  }): Promise<AiRecommendationResponse>;
}
export const IAiService = Symbol('IAiService');

export interface IAiService {
  generateQuoteSuggestions(data: any): Promise<any>;
}

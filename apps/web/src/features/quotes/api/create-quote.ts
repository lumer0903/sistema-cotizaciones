import { apiClient } from '../../../lib/api-client';

export const createQuote = async (data: any) => {
  return apiClient('/quotes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

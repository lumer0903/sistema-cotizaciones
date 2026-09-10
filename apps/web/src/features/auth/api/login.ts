import { apiClient } from '../../../lib/api-client';

export const login = async (credentials: { email: string; password: string }) => {
  const response = await apiClient('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
  
  if (response?.access_token) {
    localStorage.setItem('access_token', response.access_token);
  }
  return response;
};

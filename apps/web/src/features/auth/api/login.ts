import { apiClient } from '../../../lib/api-client';

interface LoginResponse {
  access_token: string;
}

export const login = async (credentials: { email: string; password: string }) => {
  const response: LoginResponse = await apiClient('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
  
  if (response?.access_token) {
    localStorage.setItem('access_token', response.access_token);
  }
  return response;
};

'use client';

import axios from 'axios';
import { getAuthToken, clearAuthToken } from './cookies';
import { useAuthStore } from './store/useAuthStore';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const activeAccount = useAuthStore.getState().activeAccount;
  if (activeAccount) {
    config.headers['X-Account-Id'] = activeAccount.id;
    if (activeAccount.organizationId) {
      config.headers['X-Organization-Id'] = activeAccount.organizationId;
    }
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    console.log('[API Success]', {
      method: response.config.method?.toUpperCase(),
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    
    return response;
  },
  (error) => {
    console.error('[API Error]', {
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });

    if (error.response?.status === 401) {
      console.warn('[API Auth] Redirigiendo a /login por error 401 Unauthenticated');
      clearAuthToken();
      if (
        typeof window !== 'undefined' &&
        window.location.pathname !== '/login'
      ) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
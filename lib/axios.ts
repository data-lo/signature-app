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

  // Multi-tenancy: el backend resuelve el contexto operativo (cuenta y,
  // si aplica, organización) a partir de estos headers globales.
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
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
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
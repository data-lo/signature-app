'use client';

import axios from 'axios';
import { getAuthToken, clearAuthToken } from './cookies';
import { useAuthStore } from './store/useAuthStore';

const apiClient = axios.create({
  baseURL: '/api',
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

  // 🔵 LOG DE PETICIÓN SALIENTE
  const fullUrl = `${config.baseURL ?? ''}${config.url ?? ''}`;
  console.group(`🔵 [API Request] ${config.method?.toUpperCase()} ${fullUrl}`);
  console.log('URL completa:', fullUrl);
  console.log('Headers:', config.headers);
  console.log('Body/Data:', config.data);
  console.groupEnd();

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    // 🟢 LOG DE RESPUESTA EXITOSA
    const fullUrl = `${response.config.baseURL ?? ''}${response.config.url ?? ''}`;
    console.group(`🟢 [API Success] ${response.config.method?.toUpperCase()} ${fullUrl}`);
    console.log('Status:', response.status);
    console.log('Headers de respuesta:', response.headers);
    console.log('Content-Type:', response.headers['content-type']);
    console.log('Data:', response.data);
    console.groupEnd();

    return response;
  },
  (error) => {
    // 🔴 LOG DE ERROR
    const fullUrl = `${error.config?.baseURL ?? ''}${error.config?.url ?? ''}`;
    console.group(`🔴 [API Error] ${error.config?.method?.toUpperCase()} ${fullUrl}`);
    console.error('Mensaje:', error.message);
    console.error('Código Axios:', error.code);

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Content-Type:', error.response.headers['content-type']);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No hubo respuesta del servidor. Request:', error.request);
    } else {
      console.error('Error al configurar la petición:', error.message);
    }
    console.groupEnd();

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
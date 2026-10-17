'use client';

import axios from 'axios';
import { getAuthToken, clearAuthToken } from './cookies';
import { useAuthStore } from './store/useAuthStore';
import {
  markApiRequestStart,
  recordApiError,
  recordApiResponse,
} from './observability/api-request';

const apiClient = axios.create({
  baseURL: '/api',
});

/**
 * Bitácora de consola sólo en desarrollo, y sin cuerpos: la integración de consola de Sentry
 * convierte cada `console.*` en un breadcrumb que viaja a GlitchTip, y el `data` de las
 * respuestas lleva datos personales y documentos. La observabilidad real va por
 * `recordApiResponse`/`recordApiError` (ver `./observability/api-request`).
 */
const logToConsole = process.env.NODE_ENV === 'development';

apiClient.interceptors.request.use((config) => {
  markApiRequestStart(config);

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
    recordApiResponse(response);
    if (logToConsole) {
      console.log('[API Success]', {
        method: response.config.method?.toUpperCase(),
        url: response.config.url,
        status: response.status,
      });
    }

    return response;
  },
  (error) => {
    const record = recordApiError(error);
    if (logToConsole) {
      console.error('[API Error]', {
        method: error.config?.method?.toUpperCase(),
        url: error.config?.url,
        status: error.response?.status,
        failure: record?.failure_category,
        message: error.message,
      });
    }

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
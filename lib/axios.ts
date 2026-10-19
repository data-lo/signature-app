'use client';

import axios from 'axios';
import { getAuthToken, clearAuthToken } from './cookies';
import { useAuthStore } from './store/useAuthStore';
import { markApiRequestStart } from './observability/api-request';
import {
  buildSafeHttpLog,
  reportSafeHttpLog,
} from './observability/safe-log';

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
  // Antes se imprimían `response.data` y `error.response.data`: datos de usuarios, documentos y
  // firmas que, vía la integración de consola de Sentry, acababan en GlitchTip. Ahora sólo sale
  // el log seguro (método, ruta normalizada, estado, duración y categoría del fallo).
  (response) => {
    const log = buildSafeHttpLog({
      config: response.config,
      status: response.status,
    });
    if (log) reportSafeHttpLog(log);

    return response;
  },
  (error) => {
    const log = buildSafeHttpLog({
      config: error?.config,
      status: error?.response?.status,
      error,
    });
    if (log) reportSafeHttpLog(log);

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
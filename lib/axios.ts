'use client';

import axios from 'axios';
import { getAuthToken, clearAuthToken } from './cookies';
import { useAuthStore } from './store/useAuthStore';
import { buildLoginPath } from './auth-redirect';
import {
  markApiRequestStart,
  recordApiError,
  recordApiResponse,
} from './observability/api-request';
import {
  buildSafeHttpLog,
  isConsoleLoggingEnabled,
  reportSafeHttpLog,
} from './observability/safe-log';

const apiClient = axios.create({
  baseURL: '/api',
});

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
  // firmas que, vía la integración de consola de Sentry, acababan en GlitchTip. Ahora:
  // - `recordApiResponse`/`recordApiError` dejan el breadcrumb `api.request`, completan el span
  //   del SDK y envían el evento de los fallos que conviene vigilar.
  // - El log seguro (método, ruta normalizada, estado, duración y categoría del fallo) sólo va a
  //   la consola en desarrollo: en producción su breadcrumb repetiría el de `recordApi*`.
  (response) => {
    recordApiResponse(response);
    if (isConsoleLoggingEnabled()) {
      const log = buildSafeHttpLog({
        config: response.config,
        status: response.status,
      });
      if (log) reportSafeHttpLog(log);
    }

    return response;
  },
  (error) => {
    recordApiError(error);
    if (isConsoleLoggingEnabled()) {
      const log = buildSafeHttpLog({
        config: error?.config,
        status: error?.response?.status,
        error,
      });
      if (log) reportSafeHttpLog(log);
    }

    if (error.response?.status === 401) {
      console.warn('[API Auth] Redirigiendo a /login por error 401 Unauthenticated');
      clearAuthToken();
      if (
        typeof window !== 'undefined' &&
        window.location.pathname !== '/login'
      ) {
        // Sesión expirada o revocada a media navegación: tras volver a iniciar sesión, el
        // usuario regresa a la pantalla en la que estaba.
        window.location.href = buildLoginPath(
          `${window.location.pathname}${window.location.search}`,
        );
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
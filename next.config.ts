import type { NextConfig } from 'next';

/**
 * Cuerpo máximo que el proxy de `/api/*` (ver `rewrites`) reenvía al backend: 25 MB, igual que la
 * red de seguridad de multer en signature-server (`MAX_UPLOAD_SAFETY_NET_BYTES`), para que un PDF
 * de hasta 20 MB más los campos del multipart llegue completo.
 *
 * Bug corregido: "los documentos de ~12 MB fallan al enviarse". El navegador no habla con el
 * backend directamente: `/api/*` pasa por el rewrite de Next, y Next reenvía el cuerpo desde una
 * copia que corta en `middlewareClientMaxBodySize` (10 MB por omisión, en
 * `server/lib/router-server.js` → `cloneBodyStream()`), aunque el middleware ni siquiera corra en
 * `/api` (el matcher lo excluye). Todo lo que pasaba de 10 MB llegaba truncado y multer respondía
 * `400 Multipart: Unexpected end of form`, sin ninguna relación con el límite de 20 MB.
 */
const PROXY_MAX_BODY_BYTES = 25 * 1024 * 1024;

/**
 * Tiempo máximo que el proxy de `/api/*` espera la respuesta del backend: 2 minutos.
 *
 * El valor por omisión de Next son 30 s, y cuentan desde que empieza la subida: con 20 MB en una
 * conexión modesta, más lo que el backend tarda en validar el PDF, guardarlo en MinIO y registrar
 * la solicitud, esos 30 s se agotaban y el usuario recibía un error aunque el envío siguiera en
 * curso del lado del servidor.
 */
const PROXY_TIMEOUT_MS = 120_000;

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    middlewareClientMaxBodySize: PROXY_MAX_BODY_BYTES,
    proxyTimeout: PROXY_TIMEOUT_MS,
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
  /**
   * Las rutas del módulo de documentos cuando estaba partido en secciones.
   *
   * Siguen respondiendo porque hay enlaces guardados, correos ya enviados y marcadores que
   * apuntan ahí; lo que ya no existe es una pantalla detrás. Cada una lleva al listado unificado
   * con el recorte equivalente en `?view=`, así que quien llegue por un enlace viejo ve lo que
   * iba a ver, no una lista genérica.
   *
   * Van aquí y no como un `page.tsx` que redirige: así el servidor responde el 308 sin montar una
   * ruta de Next, y no queda ningún componente de las vistas segmentadas en el árbol.
   * `permanent: true` porque el traslado es definitivo — el navegador y los buscadores pueden
   * dejar de pedir la ruta vieja.
   */
  async redirects() {
    return [
      {
        source: '/dashboard/documents/to-sign',
        destination: '/dashboard/documents?view=requires_my_signature',
        permanent: true,
      },
      // "Enviados para firma" y su ruta anterior, `/created`, que ya sólo redirigía a aquélla.
      {
        source: '/dashboard/documents/sent',
        destination: '/dashboard/documents?view=created_by_me',
        permanent: true,
      },
      {
        source: '/dashboard/documents/created',
        destination: '/dashboard/documents?view=created_by_me',
        permanent: true,
      },
      {
        source: '/dashboard/documents/completed',
        destination: '/dashboard/documents?view=completed',
        permanent: true,
      },
    ];
  },

  async rewrites() {
    const backendUrl = process.env.BACKEND_API_URL || 'http://backend:3000';

    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;

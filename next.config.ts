import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
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
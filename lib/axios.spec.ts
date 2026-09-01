/**
 * Cómo llega el navegador a la API. El cliente NO apunta al backend directamente: usa la ruta
 * same-origin `/api`, que el rewrite de `next.config.ts` reenvía al backend (`BACKEND_API_URL`).
 * Así no hay CORS ni hace falta exponer el backend públicamente — y es lo que sostienen el
 * Dockerfile y el workflow de despliegue, que inyectan `BACKEND_API_URL` como build arg y secret.
 *
 * Las dos mitades tienen que existir a la vez: `baseURL` sin el rewrite deja al navegador pidiendo
 * `/api/...` al propio Next, que responde 404; y el rewrite sin `baseURL` no lo usa nadie. Cada
 * mitad por separado compila, pasa el resto de los tests (todos mockean apiClient) y solo se nota
 * a mano en el navegador con el login roto, así que se fijan aquí las dos.
 *
 * El `baseURL` es `/api` (el proxy) y las rutas que se le pasan empiezan por `/api/v1` (el
 * prefijo global del backend): son dos `api` distintos que se apilan, así que en el navegador la
 * petición sale como `/api/api/v1/...`. Se ve raro y por eso se fija abajo — quien lo lea sin el
 * contexto va a querer "arreglar" una de las dos mitades y lo que hace es romper todas las
 * llamadas a la vez.
 *
 * Antes este archivo exigía una URL absoluta tomada de `NEXT_PUBLIC_API_BASE_URL`. Esa variable
 * ya no la lee nadie en la aplicación: el proxy la sustituyó (commit "Set API base URL to '/api'
 * and add rewrites for backend API integration"), y el test se quedó fallando contra un contrato
 * que dejó de existir.
 */
describe('apiClient', () => {
  const originalBackendUrl = process.env.BACKEND_API_URL;

  afterEach(() => {
    // `process.env` es del proceso, no del archivo: sin restaurarlo, el valor de prueba se
    // filtraría a los demás specs que corren en el mismo worker.
    if (originalBackendUrl === undefined) {
      delete process.env.BACKEND_API_URL;
    } else {
      process.env.BACKEND_API_URL = originalBackendUrl;
    }
    jest.resetModules();
  });

  it('apunta al proxy same-origin, no al backend directamente', async () => {
    const { default: apiClient } = await import('./axios');

    expect(apiClient.defaults.baseURL).toBe('/api');
  });

  it('next.config reenvía /api/* al backend, que es lo que hace utilizable ese baseURL', async () => {
    const { default: nextConfig } = await import('../next.config');

    const rewrites = await nextConfig.rewrites!();
    const apiRewrite = (Array.isArray(rewrites) ? rewrites : []).find(
      (rule) => rule.source === '/api/:path*',
    );

    expect(apiRewrite).toBeDefined();
    expect(apiRewrite!.destination).toMatch(/\/:path\*$/);
  });

  /**
   * El recorrido completo de una llamada, de punta a punta, en una sola aserción: es la única
   * forma de ver que el `/api` del proxy y el `/api/v1` del backend son piezas distintas y que
   * ninguna de las dos sobra. El backend tiene que recibir `/api/v1/...` UNA sola vez — un
   * `/api/v1/api/v1/...` significaría que el prefijo quedó además dentro del `@Controller()`.
   */
  it('una ruta versionada llega al backend con /api/v1 una sola vez', async () => {
    process.env.BACKEND_API_URL = 'http://api-de-prueba:3000';
    jest.resetModules();

    const { default: apiClient } = await import('./axios');
    const { default: nextConfig } = await import('../next.config');

    // 1. Lo que el navegador pide: el `baseURL` del proxy delante de la ruta versionada.
    const enElNavegador = apiClient.getUri({ url: '/api/v1/auth/login' });
    expect(enElNavegador).toBe('/api/api/v1/auth/login');

    // 2. Lo que el rewrite de Next hace con eso: se come el `/api` del proxy y reenvía el resto.
    const rewrites = await nextConfig.rewrites!();
    const apiRewrite = (Array.isArray(rewrites) ? rewrites : []).find(
      (rule) => rule.source === '/api/:path*',
    )!;
    const path = enElNavegador.replace('/api/', '');
    const enElBackend = apiRewrite.destination.replace(':path*', path);

    expect(enElBackend).toBe('http://api-de-prueba:3000/api/v1/auth/login');
  });

  it('el destino del rewrite sale de BACKEND_API_URL', async () => {
    process.env.BACKEND_API_URL = 'http://api-de-prueba:3000';
    jest.resetModules();

    const { default: nextConfig } = await import('../next.config');
    const rewrites = await nextConfig.rewrites!();
    const apiRewrite = (Array.isArray(rewrites) ? rewrites : []).find(
      (rule) => rule.source === '/api/:path*',
    );

    expect(apiRewrite!.destination).toBe('http://api-de-prueba:3000/:path*');
  });
});

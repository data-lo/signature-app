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

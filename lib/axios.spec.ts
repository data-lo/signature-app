/**
 * Regresión: `baseURL` de este cliente ya se rompió una vez, hardcodeado a `'/api'` (un proxy
 * same-origin que solo resuelve dentro de la red de Docker vía el rewrite de next.config.ts —
 * nunca funciona desde un navegador real apuntando al dev server). Sin este test, ese error
 * vuelve a colarse en silencio: compila bien, pasa el resto de los tests (todos mockean
 * apiClient), y solo se nota manualmente en el navegador con el login roto.
 */
describe('apiClient', () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_BASE_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = originalEnv;
    jest.resetModules();
  });

  it('usa una URL absoluta por defecto cuando no hay NEXT_PUBLIC_API_BASE_URL', async () => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    jest.resetModules();
    const { default: apiClient } = await import('./axios');

    expect(apiClient.defaults.baseURL).toMatch(/^https?:\/\//);
  });

  it('respeta NEXT_PUBLIC_API_BASE_URL cuando está definida', async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.com';
    jest.resetModules();
    const { default: apiClient } = await import('./axios');

    expect(apiClient.defaults.baseURL).toBe('https://api.example.com');
  });
});

import { cookies } from 'next/headers';
import { backendRequest, BackendRequestError } from './backend-request';

jest.mock('next/headers', () => ({ cookies: jest.fn() }));

const mockedCookies = cookies as jest.Mock;

function withToken(token: string | undefined) {
  mockedCookies.mockResolvedValue({
    get: (name: string) =>
      name === 'token' && token !== undefined ? { value: token } : undefined,
  });
}

/**
 * Base que compone el módulo. Se deriva igual que él —y no se escribe a mano— porque jest no
 * carga `.env.local`: fijar aquí el host de desarrollo haría fallar la prueba por el entorno en
 * lugar de por la ruta, que es lo que de verdad verifica.
 */
const EXPECTED_BASE = process.env.BACKEND_API_URL ?? 'http://backend:3000';

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: `status ${status}`,
    json: async () => body,
  } as unknown as Response;
}

describe('backendRequest', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockReset();
    mockedCookies.mockReset();
    withToken('jwt-de-sesion');
  });

  it('manda la sesión de la cookie y devuelve el campo data de la respuesta', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ success: true, message: 'ok', data: [{ accountId: 'a1' }] }),
    );

    const data = await backendRequest<{ accountId: string }[]>(
      'organizations/org-1/members',
    );

    expect(data).toEqual([{ accountId: 'a1' }]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      `${EXPECTED_BASE}/api/v1/organizations/org-1/members`,
    );
    expect(init.headers.Authorization).toBe('Bearer jwt-de-sesion');
    // Sin cuenta activa no se inventa el header: hay endpoints que lo rechazan si llega vacío.
    expect(init.headers['X-Account-Id']).toBeUndefined();
  });

  /**
   * El listado NO puede servirse de caché: los miembros cambian por acciones de otros
   * administradores, y una respuesta cacheada mostraría un equipo que ya no es el que hay.
   */
  it('no cachea la respuesta', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [] }));

    await backendRequest('organizations/org-1/members');

    expect(fetchMock.mock.calls[0][1].cache).toBe('no-store');
  });

  it('propaga X-Account-Id sólo cuando el llamador lo aporta', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: null }));

    await backendRequest('organizations/invite', {
      method: 'POST',
      body: { email: 'ana@empresa.com', roleId: 'role-1' },
      accountId: 'org-account-1',
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.headers['X-Account-Id']).toBe('org-account-1');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe(
      JSON.stringify({ email: 'ana@empresa.com', roleId: 'role-1' }),
    );
  });

  it('añade los parámetros de consulta que se le pasen', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [] }));

    await backendRequest('organizations/org-1/members', {
      searchParams: { includeInactive: 'true', vacio: undefined },
    });

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get('includeInactive')).toBe('true');
    expect(url.searchParams.has('vacio')).toBe(false);
  });

  /**
   * Sin cookie no se llama al backend siquiera: la sección traduce este 401 en una redirección al
   * login, que es la única salida útil.
   */
  it('falla con 401 y sin llamar al backend cuando no hay sesión', async () => {
    withToken(undefined);

    await expect(backendRequest('organizations/org-1/members')).rejects.toMatchObject(
      { status: 401 },
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('convierte una respuesta de error en BackendRequestError con su código y mensaje', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: 'No eres miembro de esta organización' }, 403),
    );

    await expect(
      backendRequest('organizations/ajena/members'),
    ).rejects.toMatchObject({
      status: 403,
      message: 'No eres miembro de esta organización',
    });
  });

  /**
   * Un proxy delante del backend devuelve HTML, no el `{ success, message }` de la API. Si se
   * dejara reventar a `response.json()`, un 502 ya diagnosticado llegaría disfrazado de
   * `SyntaxError` sin relación con la causa.
   */
  it('sobrevive a una respuesta de error que no es JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    } as unknown as Response);

    await expect(backendRequest('organizations/org-1/members')).rejects.toMatchObject(
      { status: 502, message: 'Bad Gateway' },
    );
  });

  it('convierte un fallo de red en un error sin código', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    const error = await backendRequest('organizations/org-1/members').catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(BackendRequestError);
    expect((error as BackendRequestError).status).toBeNull();
  });

  /** El token es lo único que no puede acabar en un mensaje de error: de ahí se copia y pega. */
  it('nunca incluye el token en el error', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Prohibido' }, 403));

    const error = (await backendRequest('organizations/org-1/members').catch(
      (caught: unknown) => caught,
    )) as Error;

    expect(error.message).not.toContain('jwt-de-sesion');
  });
});

import { BackendRequestError } from '@/lib/server/backend-request';
import { toFailedResult } from './_result';

jest.mock('next/headers', () => ({ cookies: jest.fn() }));

describe('toFailedResult', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Es la mitad del valor de la pantalla de miembros: "no existe un usuario con ese correo" le
   * dice al administrador que le toca invitar, y "ya es miembro" que no hay nada que hacer. Un
   * mensaje genérico lo dejaría probando a ciegas.
   */
  it('reenvía el mensaje del backend cuando el rechazo es 4xx', () => {
    const result = toFailedResult(
      new BackendRequestError(409, 'Esa persona ya es miembro'),
      'respaldo',
    );

    expect(result).toEqual({
      ok: false,
      message: 'Esa persona ya es miembro',
    });
  });

  /**
   * Un 500 puede traer el error crudo de la base o de un proveedor, con nombres de tablas o rutas
   * internas. Eso no se enseña: se sustituye por el respaldo.
   */
  it('oculta el mensaje del backend en un 5xx y usa el de respaldo', () => {
    const result = toFailedResult(
      new BackendRequestError(
        500,
        'duplicate key value violates unique constraint "accounts_pkey"',
      ),
      'Ocurrió un error al agregar al miembro. Intenta de nuevo.',
    );

    expect(result).toEqual({
      ok: false,
      message: 'Ocurrió un error al agregar al miembro. Intenta de nuevo.',
    });
  });

  it('usa el respaldo cuando no se llegó al servidor', () => {
    const result = toFailedResult(
      new BackendRequestError(null, 'fetch failed'),
      'respaldo',
    );

    expect(result).toEqual({ ok: false, message: 'respaldo' });
  });

  it('usa el respaldo ante un error que no viene del backend', () => {
    const result = toFailedResult(new TypeError('x is not a function'), 'respaldo');

    expect(result).toEqual({ ok: false, message: 'respaldo' });
  });

  it('deja el detalle completo en el log del servidor', () => {
    const error = new BackendRequestError(500, 'interno');

    toFailedResult(error, 'respaldo');

    expect(console.error).toHaveBeenCalledWith(
      '[organization-members] falló la mutación:',
      error,
    );
  });
});

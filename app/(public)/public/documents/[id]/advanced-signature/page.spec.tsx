import { redirect } from 'next/navigation';
import LegacyAdvancedSignaturePage from './page';

jest.mock('next/navigation', () => ({ redirect: jest.fn() }));

const mockedRedirect = redirect as unknown as jest.Mock;

describe('LegacyAdvancedSignaturePage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('redirige a la pantalla pública única conservando la invitación', async () => {
    await LegacyAdvancedSignaturePage({
      params: Promise.resolve({ id: 'doc-1' }),
      searchParams: Promise.resolve({
        collabId: 'c-1',
        email: 'ana@correo.mx',
      }),
    });

    expect(mockedRedirect).toHaveBeenCalledWith(
      '/public/documents/doc-1/sign?collabId=c-1&email=ana%40correo.mx',
    );
  });

  it('sin query, redirige a /sign sin parámetros', async () => {
    await LegacyAdvancedSignaturePage({
      params: Promise.resolve({ id: 'doc-1' }),
      searchParams: Promise.resolve({}),
    });

    expect(mockedRedirect).toHaveBeenCalledWith('/public/documents/doc-1/sign');
  });
});

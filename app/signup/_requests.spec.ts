import apiClient from '@/lib/axios';

import { registerRequest, type RegisterRequestValues } from './_requests';

jest.mock('@/lib/axios', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

const mockedPost = apiClient.post as jest.Mock;

const values: RegisterRequestValues = {
  firstName: 'Ana',
  lastName: 'Gómez',
  email: 'ana@empresa.com',
  nationalId: 'GOMA900101MDFRNN01',
  rfc: 'GOMA900101ABC',
  password: 'Password123!',
  confirmPassword: 'Password123!',
  turnstileToken: '0.token-del-widget',
};

describe('registerRequest', () => {
  beforeEach(() => {
    mockedPost.mockReset();
    mockedPost.mockResolvedValue({ data: { data: { userId: 'user-1' } } });
  });

  /**
   * El registro sólo crea la cuenta: el token de la invitación se queda en el cliente, que la
   * acepta después con su propio endpoint. Mandarlo al registro daría a entender que ahí se usa.
   */
  it('no manda el token de la invitación al registro', async () => {
    await registerRequest({ ...values, invitationToken: 'invite-token-1' });

    const [, body] = mockedPost.mock.calls[0];
    expect(body).not.toHaveProperty('invitationToken');
    expect(body).toMatchObject({ rfc: 'GOMA900101ABC', turnstileToken: '0.token-del-widget' });
  });
});

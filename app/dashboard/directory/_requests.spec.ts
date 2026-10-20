import apiClient from '@/lib/axios';
import {
  createDirectoryContactRequest,
  deleteDirectoryContactRequest,
  listDirectoryContactsRequest,
  updateDirectoryContactRequest,
} from './_requests';

jest.mock('@/lib/axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedGet = apiClient.get as jest.Mock;
const mockedPost = apiClient.post as jest.Mock;
const mockedPatch = apiClient.patch as jest.Mock;
const mockedDelete = apiClient.delete as jest.Mock;

/**
 * Contacto tal como lo responde signature-server (`DirectoryContactResponse`), copiado de una
 * respuesta real de `GET /api/v1/directory/contacts`. `DirectoryController` no envuelve en
 * `{ success, message, data }`: si algún día lo hace, estas pruebas deben cambiar junto con
 * `_requests.ts`.
 */
const contact = {
  id: '9e6bdcf5-3100-4481-9b11-8a7f505c53d1',
  firstName: 'Ana',
  lastName: 'García',
  email: 'ana@example.com',
  taxId: null,
  phone: null,
  linkedPersonalAccountId: null,
  linkedUserId: null,
  archivedAt: null,
  createdAt: '2026-10-20T19:32:38.412Z',
  updatedAt: '2026-10-20T19:32:38.412Z',
};

const page = {
  items: [contact],
  pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
};

beforeEach(() => {
  jest.resetAllMocks();
});

describe('listDirectoryContactsRequest', () => {
  it('devuelve la página tal como la responde el backend, sin sobre', async () => {
    mockedGet.mockResolvedValue({ data: page });

    await expect(
      listDirectoryContactsRequest({ page: 1, limit: 25 }),
    ).resolves.toEqual(page);
  });

  it('un directorio vacío es una página vacía, no undefined', async () => {
    const empty = {
      items: [],
      pagination: { page: 1, limit: 25, total: 0, totalPages: 0 },
    };
    mockedGet.mockResolvedValue({ data: empty });

    await expect(
      listDirectoryContactsRequest({ page: 1, limit: 25 }),
    ).resolves.toEqual(empty);
  });

  it('manda la búsqueda recortada y la omite si queda vacía', async () => {
    mockedGet.mockResolvedValue({ data: page });

    await listDirectoryContactsRequest({
      page: 2,
      limit: 10,
      search: '  garcia ',
    });
    await listDirectoryContactsRequest({ page: 1, limit: 25, search: '   ' });

    expect(mockedGet).toHaveBeenNthCalledWith(1, '/api/v1/directory/contacts', {
      params: { page: 2, limit: 10, search: 'garcia' },
    });
    expect(mockedGet).toHaveBeenNthCalledWith(2, '/api/v1/directory/contacts', {
      params: { page: 1, limit: 25 },
    });
  });
});

describe('createDirectoryContactRequest', () => {
  it('devuelve el contacto creado', async () => {
    mockedPost.mockResolvedValue({ data: contact });
    const values = {
      firstName: 'Ana',
      lastName: 'García',
      email: 'ana@example.com',
    };

    await expect(createDirectoryContactRequest(values)).resolves.toEqual(
      contact,
    );
    expect(mockedPost).toHaveBeenCalledWith(
      '/api/v1/directory/contacts',
      values,
    );
  });
});

describe('updateDirectoryContactRequest', () => {
  it('devuelve el contacto actualizado', async () => {
    mockedPatch.mockResolvedValue({ data: contact });

    await expect(
      updateDirectoryContactRequest(contact.id, { lastName: 'García' }),
    ).resolves.toEqual(contact);
    expect(mockedPatch).toHaveBeenCalledWith(
      `/api/v1/directory/contacts/${contact.id}`,
      { lastName: 'García' },
    );
  });
});

describe('deleteDirectoryContactRequest', () => {
  it('llama al DELETE del contacto', async () => {
    mockedDelete.mockResolvedValue({
      data: { ...contact, archivedAt: contact.updatedAt },
    });

    await expect(
      deleteDirectoryContactRequest(contact.id),
    ).resolves.toBeUndefined();
    expect(mockedDelete).toHaveBeenCalledWith(
      `/api/v1/directory/contacts/${contact.id}`,
    );
  });
});

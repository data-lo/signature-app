import { downloadBase64Evidence } from './download-base64-evidence';

/** `dG9rZW4tdHM=` en Base64 decodifica a los bytes de "token-ts". */
const BASE64 = 'dG9rZW4tdHM=';

describe('downloadBase64Evidence', () => {
  let createObjectURL: jest.Mock;
  let revokeObjectURL: jest.Mock;
  let clickSpy: jest.SpyInstance;

  beforeEach(() => {
    createObjectURL = jest.fn(() => 'blob:mock-url');
    revokeObjectURL = jest.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click');
  });

  afterEach(() => {
    clickSpy.mockRestore();
  });

  it('decodifica el Base64 a los bytes crudos y arma un blob binario, no de texto', () => {
    downloadBase64Evidence(BASE64, 'sello-de-tiempo-doc-1.tsr');

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const [blob] = createObjectURL.mock.calls[0] as [Blob];
    expect(blob.type).toBe('application/octet-stream');
    expect(blob.size).toBe(8); // "token-ts" son 8 bytes
  });

  it('dispara la descarga con el nombre de archivo dado y libera el object URL', () => {
    downloadBase64Evidence(BASE64, 'sello-de-tiempo-doc-1.tsr');

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});

import {
  MAX_VERIFICATION_FILE_SIZE,
  documentVerificationResultSchema,
  validateVerificationFile,
} from './_schemas';

function fileOf(name: string, type: string, content: BlobPart = 'x') {
  return new File([content], name, { type });
}

describe('validateVerificationFile', () => {
  it.each([
    ['XML con application/xml', fileOf('auditoria.xml', 'application/xml')],
    ['XML con text/xml', fileOf('auditoria.xml', 'text/xml')],
    ['XML sin tipo MIME', fileOf('auditoria.xml', '')],
    ['PDF final', fileOf('contrato.pdf', 'application/pdf')],
    ['extensión en mayúsculas', fileOf('CONTRATO.PDF', 'application/pdf')],
  ])('acepta %s', (_, file) => {
    expect(validateVerificationFile(file)).toBeNull();
  });

  it.each([
    [
      'un Word',
      fileOf(
        'contrato.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    ],
    ['una imagen', fileOf('foto.png', 'image/png')],
    ['un .xml con tipo de imagen', fileOf('auditoria.xml', 'image/png')],
    ['un PDF sin extensión', fileOf('contrato', 'application/pdf')],
  ])('rechaza %s', (_, file) => {
    expect(validateVerificationFile(file)).toMatch(
      /XML de auditoría \(\.xml\) o PDF \(\.pdf\)/,
    );
  });

  it('rechaza un archivo vacío', () => {
    expect(
      validateVerificationFile(fileOf('a.pdf', 'application/pdf', '')),
    ).toMatch(/vacío/);
  });

  it('rechaza un archivo que supera el tope', () => {
    const file = fileOf('a.pdf', 'application/pdf');
    Object.defineProperty(file, 'size', {
      value: MAX_VERIFICATION_FILE_SIZE + 1,
    });

    expect(validateVerificationFile(file)).toMatch(/50 MB/);
  });

  it('sin archivo no hay mensaje', () => {
    expect(validateVerificationFile(null)).toBeNull();
  });
});

describe('documentVerificationResultSchema', () => {
  it('acepta un resultado mínimo, sólo con el estado', () => {
    expect(
      documentVerificationResultSchema.parse({ status: 'NOT_FOUND' }),
    ).toEqual({
      status: 'NOT_FOUND',
    });
  });

  it('rechaza un estado desconocido', () => {
    expect(() =>
      documentVerificationResultSchema.parse({ status: 'MAYBE' }),
    ).toThrow();
  });
});

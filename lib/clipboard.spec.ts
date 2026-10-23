import { copyTextToClipboard } from './clipboard';

/** jsdom no implementa ninguna de las dos APIs, así que cada prueba instala la que le toca. */
function setClipboardApi(value: unknown) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value,
  });
}

function setExecCommand(impl: jest.Mock | undefined) {
  Object.defineProperty(document, 'execCommand', {
    configurable: true,
    value: impl,
  });
}

describe('copyTextToClipboard', () => {
  afterEach(() => {
    setClipboardApi(undefined);
    setExecCommand(undefined);
  });

  it('usa la Clipboard API cuando está disponible', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    setClipboardApi({ writeText });

    await expect(copyTextToClipboard('https://app/x')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('https://app/x');
  });

  /**
   * `navigator.clipboard` solo existe en contextos seguros: en un despliegue interno servido por
   * IP sobre HTTP plano es `undefined`, y sin este respaldo la acción de copiar quedaría muerta.
   */
  it('cae al respaldo con textarea + execCommand cuando no hay Clipboard API', async () => {
    setClipboardApi(undefined);
    const execCommand = jest.fn().mockReturnValue(true);
    setExecCommand(execCommand);

    await expect(copyTextToClipboard('https://app/x')).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
  });

  it('no deja el textarea del respaldo en el DOM', async () => {
    setClipboardApi(undefined);
    setExecCommand(jest.fn().mockReturnValue(true));

    await copyTextToClipboard('https://app/x');

    expect(document.querySelectorAll('textarea')).toHaveLength(0);
  });

  it('devuelve false (sin lanzar) si la Clipboard API rechaza, p. ej. sin permiso', async () => {
    setClipboardApi({
      writeText: jest.fn().mockRejectedValue(new Error('NotAllowedError')),
    });

    await expect(copyTextToClipboard('https://app/x')).resolves.toBe(false);
  });

  it('devuelve false si el respaldo tampoco puede copiar', async () => {
    setClipboardApi(undefined);
    setExecCommand(jest.fn().mockReturnValue(false));

    await expect(copyTextToClipboard('https://app/x')).resolves.toBe(false);
  });

  it('devuelve false (sin lanzar) si no hay ninguna de las dos APIs', async () => {
    setClipboardApi(undefined);
    setExecCommand(undefined);

    await expect(copyTextToClipboard('https://app/x')).resolves.toBe(false);
  });
});

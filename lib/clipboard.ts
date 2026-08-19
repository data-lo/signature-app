/**
 * Copia texto al portapapeles con respaldo para los contextos donde `navigator.clipboard` no
 * existe: la Clipboard API solo está disponible en contextos seguros (HTTPS o localhost), así que
 * en los despliegues internos servidos por IP sobre HTTP plano sería `undefined` y cualquier
 * acción de "copiar" quedaría muerta sin avisar.
 *
 * @returns `true` si el texto quedó en el portapapeles. Nunca lanza: quien la llame decide qué
 * mostrar cuando devuelve `false` (típicamente, ofrecer el texto para copiarlo a mano).
 */
export async function copyTextToClipboard(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}

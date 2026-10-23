import { saveBlobAsFile } from './save-blob-as-file';

/**
 * Decodifica un Base64 a sus bytes crudos y dispara la descarga como archivo binario.
 *
 * El sello de tiempo y la constancia de integridad NOM-151 viajan como Base64 de un DER/ASN.1 — la
 * evidencia tal cual la emitió el PSC, no un PDF. Decodificar en el navegador y guardar un blob es
 * lo que garantiza que el archivo en disco sea ese binario y no el texto Base64: `atob` da la
 * cadena binaria byte a byte, y cada `charCodeAt` cae dentro de 0-255 porque eso es exactamente lo
 * que Base64 codifica.
 */
export function downloadBase64Evidence(base64: string, fileName: string): void {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  saveBlobAsFile(
    new Blob([bytes], { type: 'application/octet-stream' }),
    fileName,
  );
}

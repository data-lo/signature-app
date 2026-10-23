/**
 * Guarda un blob en disco con el nombre pedido, creando y disparando un enlace temporal.
 *
 * Es el único lugar donde vive esa mecánica. Las tres descargas de la vista pública —la evidencia
 * Base64 del PSC, el XML canónico y el XML de auditoría— llegan por caminos distintos y validan
 * cosas distintas, pero todas terminan igual: en un enlace que el navegador tiene que "clickear"
 * para que el archivo aterrice en la carpeta de descargas. Repetirlo en cada una hacía que una
 * corrección (revocar el object URL, por ejemplo) hubiera que aplicarla tres veces.
 *
 * El `revokeObjectURL` no es opcional: sin él, el blob —que en el XML de auditoría puede pesar
 * decenas de MB con los PDFs adentro— se queda retenido en memoria mientras la pestaña siga viva.
 */
export function saveBlobAsFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

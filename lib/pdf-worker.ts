import { pdfjs } from 'react-pdf';

/**
 * Configuración única del worker de PDF.js, importada por todos los visores (`PdfPreview`,
 * `SignaturePlacementPdfPreview`, `PublicPdfViewer`).
 *
 * Bug corregido: "el documento no carga al abrirlo para firmar". El worker se pedía en tiempo de
 * ejecución a un CDN externo (`https://unpkg.com/pdfjs-dist@<version>/build/pdf.worker.min.mjs`).
 * react-pdf no puede parsear ningún PDF sin ese worker, así que cualquier entorno que no alcance
 * unpkg —red corporativa con proxy/allowlist, despliegue sin salida a internet, CSP que restrinja
 * `script-src`/`worker-src`, o simplemente unpkg lento o caído— dejaba el visor en "Error al
 * cargar el documento" con el resto de la pantalla funcionando: el documento se veía en el
 * listado y la vista de firma abría, pero el archivo nunca aparecía.
 *
 * `new URL(..., import.meta.url)` hace que el bundler (Turbopack y webpack lo soportan) emita el
 * worker como un asset estático propio y lo sirva desde el mismo origen que la app: sin salida a
 * internet, sin desfase de versión contra el `pdfjs-dist` instalado y sin un archivo copiado a
 * mano en `public/` que haya que recordar actualizar en cada bump de la dependencia.
 */
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

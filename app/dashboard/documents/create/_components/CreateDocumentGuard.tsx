'use client';

import CreateDocumentView from './CreateDocumentView';

/**
 * /dashboard/documents/create es la ruta por defecto del dashboard.
 *
 * Ya no bloquea nada. Antes esta pantalla se renderizaba inerte (`pointer-events-none`, opacidad
 * reducida) mientras el usuario no hubiera terminado su onboarding, con un banner encima
 * explicando qué le faltaba. Crear un documento no exige tener identidad ni firma: quien lo crea
 * no siempre es quien lo firma, y aunque lo sea, puede preparar la solicitud mientras resuelve
 * su verificación. El único momento en que la credencial importa es al firmar con firma Simple,
 * y ahí lo advierte `SignatureTypeField` sin impedir continuar.
 *
 * Se conserva como componente —en vez de montar `CreateDocumentView` directo en la página— para
 * no mover la ruta ni sus pruebas mientras el bloqueo desaparece.
 */
export default function CreateDocumentGuard() {
  return <CreateDocumentView trackDocumentsCount showCreatedDocuments={false} />;
}
